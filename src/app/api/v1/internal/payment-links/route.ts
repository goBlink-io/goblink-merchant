import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

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

  const hours = expiresInHours && expiresInHours > 0 ? expiresInHours : 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const serviceClient = getServiceClient();

  const paymentData = {
    merchant_id: merchant.id,
    amount: Number(amount),
    currency: (currency || merchant.currency || "USD").toUpperCase(),
    deposit_address: merchant.wallet_address,
    status: "pending" as const,
    expires_at: expiresAt,
    metadata: memo ? { memo, source: "payment_link" } : { source: "payment_link" },
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
