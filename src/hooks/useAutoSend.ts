"use client";

import { useState, useCallback } from "react";
import { useSendTransaction, useWriteContract, useAccount } from "wagmi";
import { parseUnits, erc20Abi, type Address } from "viem";

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

export function useAutoSend({ paymentId, chainId, customerEmail, onSuccess, onError }: UseAutoSendOptions) {
  const [status, setStatus] = useState<AutoSendStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address: walletAddress } = useAccount();

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
        onError("Missing wallet, deposit address, or amount");
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
          }),
        });

        if (!completeRes.ok) {
          const data = await completeRes.json();
          throw new Error(data?.error?.message || "Failed to register payment");
        }

        setStatus("success");
        onSuccess(hash);
      } catch (err) {
        setStatus("error");
        const message =
          err instanceof Error
            ? err.message.includes("User rejected")
              ? "Transaction rejected by wallet"
              : err.message.slice(0, 100)
            : "Transaction failed";
        setTxHash(null);
        onError(message);
      }
    },
    [walletAddress, sendTransactionAsync, writeContractAsync, paymentId, chainId, customerEmail, onSuccess, onError]
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
