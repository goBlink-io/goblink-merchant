"use client";

import { useState, useCallback, useRef } from "react";
import { useSendTransaction, useWriteContract, useAccount, usePublicClient } from "wagmi";
import { erc20Abi, type Address } from "viem";

interface Token {
  defuse_asset_id: string;
  blockchain: string;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon?: string;
  price_usd?: number;
}

export type AutoSendStatus =
  | "idle"
  | "sending"
  | "confirming"
  | "success"
  | "error";

interface UseAutoSendOptions {
  paymentId: string;
  chainId: string;
  customerEmail?: string; // P2-E: optional customer email for receipt
  customFields?: Record<string, string>; // HXF 3.4: custom checkout field values
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}

/**
 * Check if a token address represents the native token
 */
function isNativeToken(token: Token): boolean {
  const addr = token.address?.toLowerCase() || "";
  return (
    addr === "native" ||
    addr === "" ||
    addr === "0x0000000000000000000000000000000000000000" ||
    addr === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    (token.symbol === "ETH" && (!token.address || addr === "native"))
  );
}

export function useAutoSend({ paymentId, chainId, customerEmail, customFields, onSuccess, onError }: UseAutoSendOptions) {
  const [status, setStatus] = useState<AutoSendStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  // Store callbacks in refs to avoid stale closures and dependency churn
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  /**
   * Send a transaction from the connected wallet to the deposit address.
   * For native tokens (ETH), sends a value transfer.
   * For ERC-20 tokens, calls transfer(depositAddress, amount).
   */
  const sendPayment = useCallback(
    async (
      token: Token,
      depositAddress: string,
      amountIn: string // raw amount in smallest units
    ) => {
      if (!walletAddress || !depositAddress || !amountIn) {
        onErrorRef.current("Missing wallet, deposit address, or amount");
        return;
      }

      setStatus("sending");
      setTxHash(null);

      try {
        let hash: string;

        if (isNativeToken(token)) {
          // Native token (ETH): simple value transfer
          hash = await sendTransactionAsync({
            to: depositAddress as Address,
            value: BigInt(amountIn),
          });
        } else {
          // ERC-20 token: call transfer(depositAddress, amount)
          hash = await writeContractAsync({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: "transfer",
            args: [depositAddress as Address, BigInt(amountIn)],
          });
        }

        setTxHash(hash);
        setStatus("confirming");

        // Wait for on-chain confirmation before marking complete (M18)
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({
            hash: hash as `0x${string}`,
            confirmations: 1,
          });
        }

        // Call the complete endpoint with the real tx hash
        const completeRes = await fetch(`/api/checkout/${paymentId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sendTxHash: hash,
            depositAddress,
            payerAddress: walletAddress,
            payerChain: chainId,
            ...(customerEmail ? { customerEmail } : {}),
            ...(customFields && Object.keys(customFields).length > 0 ? { customFields } : {}),
          }),
        });

        if (!completeRes.ok) {
          const data = await completeRes.json();
          throw new Error(data?.error?.message || "Failed to register payment");
        }

        setStatus("success");
        onSuccessRef.current(hash);
      } catch (err) {
        setStatus("error");
        const message =
          err instanceof Error
            ? err.message.includes("User rejected")
              ? "Transaction rejected by wallet"
              : err.message.slice(0, 100)
            : "Transaction failed";
        setTxHash(null);
        onErrorRef.current(message);
      }
    },
    [walletAddress, sendTransactionAsync, writeContractAsync, publicClient, paymentId, chainId, customerEmail, customFields]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
  }, []);

  return {
    sendPayment,
    status,
    txHash,
    reset,
    isEvm: true,
  };
}
