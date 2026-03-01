import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { dispatchWebhooks } from "@/lib/webhooks";
import { convertToUsd, getSupportedCurrencies } from "@/lib/forex";

// POST /api/v1/payments — Create a payment
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { amount, currency, orderId, returnUrl, metadata, expiresInMinutes } = body as {
    amount: string | number;
    currency?: string;
    orderId?: string;
    returnUrl?: string;
    metadata?: Record<string, unknown>;
    expiresInMinutes?: number;
  };

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return apiError("amount is required and must be a positive number", 400);
  }

  const supabase = getServiceClient();

  // Get merchant details for deposit address
  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("wallet_address, currency, settlement_token, settlement_chain")
    .eq("id", auth.merchantId)
    .single();

  if (merchantError || !merchant) {
    return apiError("Merchant not found", 404);
  }

  // Handle multi-currency: if currency is not USD, convert to USD for internal storage
  const requestedCurrency = (currency || "USD").toUpperCase();
  const supportedCurrencies = getSupportedCurrencies();
  if (requestedCurrency !== "USD" && !supportedCurrencies.includes(requestedCurrency)) {
    return apiError(`Unsupported currency: ${requestedCurrency}. Supported: ${supportedCurrencies.join(", ")}`, 400);
  }

  let amountUsd = Number(amount);
  const paymentMetadata: Record<string, unknown> = { ...(metadata || {}) };

  if (requestedCurrency !== "USD") {
    amountUsd = await convertToUsd(Number(amount), requestedCurrency);
    amountUsd = Math.round(amountUsd * 100) / 100; // Round to 2 decimal places
    paymentMetadata.original_currency = requestedCurrency;
    paymentMetadata.original_amount = Number(amount);
  }

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
    : new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Default 1 hour

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Insert payment — amount is always in USD internally
  const paymentData = {
    merchant_id: auth.merchantId,
    amount: amountUsd,
    currency: "USD",
    external_order_id: orderId || null,
    return_url: returnUrl || null,
    metadata: paymentMetadata,
    deposit_address: merchant.wallet_address,
    status: "pending" as const,
    expires_at: expiresAt,
    is_test: auth.isTest,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("payments")
    .insert(paymentData)
    .select("*")
    .single();

  if (insertError || !inserted) {
    return apiError(`Failed to create payment: ${insertError?.message}`, 500);
  }

  // Set payment_url with the generated ID
  const paymentUrl = `${appUrl}/pay/${inserted.id}`;
  const { data: payment, error } = await supabase
    .from("payments")
    .update({ payment_url: paymentUrl })
    .eq("id", inserted.id)
    .select("*")
    .single();

  if (error) {
    return apiError(`Failed to create payment: ${error.message}`, 500);
  }

  // Dispatch webhook
  dispatchWebhooks(auth.merchantId, {
    event: "payment.created",
    paymentId: payment.id,
    merchantId: auth.merchantId,
    timestamp: new Date().toISOString(),
    data: {
      amount: payment.amount,
      currency: payment.currency,
      orderId: payment.external_order_id,
      status: payment.status,
      ...(requestedCurrency !== "USD"
        ? {
            originalAmount: Number(amount),
            originalCurrency: requestedCurrency,
          }
        : {}),
    },
  });

  return apiSuccess(
    {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      depositAddress: payment.deposit_address,
      paymentUrl: payment.payment_url,
      orderId: payment.external_order_id,
      expiresAt: payment.expires_at,
      createdAt: payment.created_at,
      isTest: payment.is_test,
      ...(requestedCurrency !== "USD"
        ? {
            originalAmount: Number(amount),
            originalCurrency: requestedCurrency,
          }
        : {}),
    },
    201
  );
}

// GET /api/v1/payments — List payments
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const isTestParam = searchParams.get("is_test");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const supabase = getServiceClient();

  let query = supabase
    .from("payments")
    .select("*", { count: "exact" })
    .eq("merchant_id", auth.merchantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (orderId) {
    query = query.eq("external_order_id", orderId);
  }

  if (isTestParam !== null) {
    query = query.eq("is_test", isTestParam === "true");
  }

  const { data: payments, count, error } = await query;

  if (error) {
    return apiError(`Failed to fetch payments: ${error.message}`, 500);
  }

  return apiSuccess({
    data: (payments ?? []).map(formatPaymentResponse),
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  });
}

function formatPaymentResponse(p: Record<string, unknown>) {
  const meta = p.metadata as Record<string, unknown> | null;
  return {
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    orderId: p.external_order_id,
    cryptoAmount: p.crypto_amount,
    cryptoToken: p.crypto_token,
    cryptoChain: p.crypto_chain,
    customerWallet: p.customer_wallet,
    customerChain: p.customer_chain,
    depositAddress: p.deposit_address,
    sendTxHash: p.send_tx_hash,
    fulfillmentTxHash: p.fulfillment_tx_hash,
    feeAmount: p.fee_amount,
    feeCurrency: p.fee_currency,
    netAmount: p.net_amount,
    paymentUrl: p.payment_url,
    returnUrl: p.return_url,
    metadata: p.metadata,
    expiresAt: p.expires_at,
    confirmedAt: p.confirmed_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    isTest: p.is_test,
    ...(meta?.original_currency
      ? {
          originalAmount: meta.original_amount,
          originalCurrency: meta.original_currency,
        }
      : {}),
  };
}
