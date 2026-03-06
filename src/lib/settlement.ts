import { submitDeposit, getExecutionStatus } from "@/lib/oneclick";
import { getServiceClient } from "@/lib/service-client";

// --- Types ---

export interface SettlementInitResult {
  depositAddress: string;
  intentId: string | null;
  amountIn: string | null;
  amountOut: string | null;
}

export type SettlementStatusResult = {
  status:
    | "PENDING_DEPOSIT"
    | "KNOWN_DEPOSIT_TX"
    | "PROCESSING"
    | "SUCCESS"
    | "FAILED"
    | "REFUNDED"
    | "INCOMPLETE_DEPOSIT";
  fulfillmentTxHash?: string;
};

// --- Helpers ---

/** Build 1Click destination asset ID from chain + token (e.g. "base:mainnet:USDC") */
export function buildDestinationAsset(chain: string, token: string): string {
  return `${chain}:mainnet:${token}`;
}

/** Convert USD amount to minor units (6 decimals for stablecoins) */
function toMinorUnits(amount: number): string {
  return Math.round(amount * 1e6).toString();
}

// --- Core Functions ---

/**
 * Initiate settlement for a payment via 1Click.
 * Calls submitDeposit to get a live deposit address, then stores the settlement
 * metadata on the payment record.
 */
export async function initiateSettlement(params: {
  paymentId: string;
  amount: number;
  originAsset: string;
  refundTo: string;
  merchantWallet: string;
  settlementChain: string;
  settlementToken: string;
}): Promise<SettlementInitResult> {
  const {
    paymentId,
    amount,
    originAsset,
    refundTo,
    merchantWallet,
    settlementChain,
    settlementToken,
  } = params;

  const destinationAsset = buildDestinationAsset(settlementChain, settlementToken);

  // Get a live quote (non-dry-run) which returns a deposit address
  const quote = await submitDeposit({
    originAsset,
    destinationAsset,
    amount: toMinorUnits(amount),
    recipient: merchantWallet,
    refundTo,
    swapType: "EXACT_OUTPUT",
  });

  const quoteObj = quote as Record<string, unknown>;
  const depositAddress = quoteObj.deposit_address as string | undefined;

  if (!depositAddress) {
    throw new Error("1Click did not return a deposit address");
  }

  const intentId = (quoteObj.intent_id as string) ?? null;
  const amountIn = (quoteObj.amount_in as string) ?? null;
  const amountOut = (quoteObj.amount_out as string) ?? null;

  // Persist settlement metadata on the payment
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("payments")
    .update({
      deposit_address: depositAddress,
      intent_id: intentId,
      settlement_status: "pending",
      settlement_chain: settlementChain,
      settlement_token: settlementToken,
    })
    .eq("id", paymentId);

  if (error) {
    throw new Error(`Failed to update payment with settlement data: ${error.message}`);
  }

  return { depositAddress, intentId, amountIn, amountOut };
}

/**
 * Check the settlement status of a payment via 1Click.
 * Returns the raw execution status from the 1Click API.
 */
export async function checkSettlementStatus(
  depositAddress: string
): Promise<SettlementStatusResult> {
  const execution = await getExecutionStatus(depositAddress);
  const execObj =
    typeof execution === "object" && execution !== null
      ? (execution as Record<string, unknown>)
      : {};

  return {
    status: (execObj.status as SettlementStatusResult["status"]) ?? "PENDING_DEPOSIT",
    fulfillmentTxHash: execObj.fulfillmentTxHash as string | undefined,
  };
}
