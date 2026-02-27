import {
  OpenAPI,
  OneClickService,
  QuoteRequest,
} from "@defuse-protocol/one-click-sdk-typescript";

// Lazy SDK init — deferred so module can be imported at build time without env vars
let _initialized = false;

function ensureInit() {
  if (_initialized) return;
  if (!process.env.ONE_CLICK_BASE_URL) {
    throw new Error("ONE_CLICK_BASE_URL environment variable is required");
  }
  OpenAPI.BASE = process.env.ONE_CLICK_BASE_URL;
  if (process.env.ONE_CLICK_JWT) {
    OpenAPI.TOKEN = process.env.ONE_CLICK_JWT.trim();
  }
  _initialized = true;
}

export async function getTokens() {
  ensureInit();
  return OneClickService.getTokens();
}

function buildQuoteRequest(params: {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  swapType: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageTolerance?: number;
  dry: boolean;
}) {
  // Deadline: 30 minutes from now
  const deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    dry: params.dry,
    swapType: params.swapType === "EXACT_INPUT"
      ? QuoteRequest.swapType.EXACT_INPUT
      : QuoteRequest.swapType.EXACT_OUTPUT,
    slippageTolerance: params.slippageTolerance ?? 100, // 100 basis points = 1%
    originAsset: params.originAsset,
    destinationAsset: params.destinationAsset,
    amount: params.amount,
    refundTo: params.refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient: params.recipient,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    deadline,
    referral: "goblink",
  };
}

export async function getQuote(params: {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  swapType: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageTolerance?: number;
  dryRun?: boolean;
}) {
  ensureInit();
  const request = buildQuoteRequest({
    ...params,
    dry: params.dryRun ?? true,
  });
  return OneClickService.getQuote(request);
}

export async function submitDeposit(params: {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  swapType: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageTolerance?: number;
}) {
  ensureInit();
  const request = buildQuoteRequest({
    ...params,
    dry: false,
  });
  return OneClickService.getQuote(request);
}

export async function getExecutionStatus(depositAddress: string) {
  ensureInit();
  return OneClickService.getExecutionStatus(depositAddress);
}
