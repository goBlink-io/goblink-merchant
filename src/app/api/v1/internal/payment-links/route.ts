import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { convertToUsd, getSupportedCurrencies } from "@/lib/forex";

// POST — Create a payment link (session-authenticated)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, wallet_address, currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { amount, currency, memo, expiresInHours } = body as {
    amount: string | number;
    currency?: string;
    memo?: string;
    expiresInHours?: number;
  };

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return apiError("amount is required and must be a positive number", 400);
  }

  // Handle multi-currency: convert to USD internally
  const requestedCurrency = (currency || "USD").toUpperCase();
  const supportedCurrencies = getSupportedCurrencies();
  if (requestedCurrency !== "USD" && !supportedCurrencies.includes(requestedCurrency)) {
    return apiError(`Unsupported currency: ${requestedCurrency}`, 400);
  }

  let amountUsd = Number(amount);
  const linkMetadata: Record<string, unknown> = {
    source: "payment_link",
    ...(memo ? { memo } : {}),
  };

  if (requestedCurrency !== "USD") {
    amountUsd = await convertToUsd(Number(amount), requestedCurrency);
    amountUsd = Math.round(amountUsd * 100) / 100;
    linkMetadata.original_currency = requestedCurrency;
    linkMetadata.original_amount = Number(amount);
  }

  const hours = expiresInHours && expiresInHours > 0 ? expiresInHours : 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const serviceClient = getServiceClient();

  const paymentData = {
    merchant_id: merchant.id,
    amount: amountUsd,
    currency: "USD",
    deposit_address: merchant.wallet_address,
    status: "pending" as const,
    expires_at: expiresAt,
    metadata: linkMetadata,
  };

  const { data: inserted, error: insertError } = await serviceClient
    .from("payments")
    .insert(paymentData)
    .select("*")
    .single();

  if (insertError || !inserted) {
    return apiError(`Failed to create payment: ${insertError?.message}`, 500);
  }

  const paymentUrl = `${appUrl}/pay/${inserted.id}`;
  const { data: payment, error } = await serviceClient
    .from("payments")
    .update({ payment_url: paymentUrl })
    .eq("id", inserted.id)
    .select("*")
    .single();

  if (error || !payment) {
    return apiError(`Failed to create payment link: ${error?.message}`, 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "payment_link.created",
    resourceType: "payment",
    resourceId: payment.id,
    metadata: {
      amount: amountUsd,
      currency: "USD",
      ...(requestedCurrency !== "USD"
        ? { original_amount: Number(amount), original_currency: requestedCurrency }
        : {}),
    },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(
    {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payment_url: payment.payment_url,
      expires_at: payment.expires_at,
      metadata: payment.metadata,
      created_at: payment.created_at,
    },
    201
  );
}

// GET — List payment links (session-authenticated)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  // Payment links are payments created with source: "payment_link" in metadata
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount, currency, status, payment_url, metadata, expires_at, created_at")
    .eq("merchant_id", merchant.id)
    .contains("metadata", { source: "payment_link" })
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(`Failed to fetch payment links: ${error.message}`, 500);
  }

  return apiSuccess({ data: payments ?? [] });
}
