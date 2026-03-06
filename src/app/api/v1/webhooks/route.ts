import { NextRequest } from "next/server";
import crypto from "crypto";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { validateWebhookUrl } from "@/lib/webhooks";

// POST /api/v1/webhooks — Register a webhook endpoint
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

  const { url, events } = body as {
    url?: string;
    events?: string[];
  };

  if (!url) {
    return apiError("url is required", 400);
  }

  // Validate URL (SSRF protection: checks HTTPS + resolves hostname to block private IPs)
  try {
    await validateWebhookUrl(url);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Invalid webhook URL", 400);
  }

  const validEvents = [
    "payment.created",
    "payment.processing",
    "payment.confirmed",
    "payment.failed",
    "payment.expired",
    "payment.refunded",
    "payment.partially_refunded",
    "invoice.paid",
    "invoice.overdue",
    "withdrawal.completed",
    "withdrawal.failed",
    "*",
  ];

  const selectedEvents = events || ["payment.confirmed"];
  for (const event of selectedEvents) {
    if (!validEvents.includes(event)) {
      return apiError(`Invalid event: ${event}`, 400);
    }
  }

  // Generate webhook secret
  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  const supabase = getServiceClient();

  const { data: webhook, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      merchant_id: auth.merchantId,
      url,
      secret,
      events: selectedEvents,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return apiError(`Failed to create webhook: ${error.message}`, 500);
  }

  logAudit({
    merchantId: auth.merchantId,
    actor: auth.keyId,
    action: "webhook.created",
    resourceType: "webhook",
    resourceId: webhook.id,
    metadata: { url, events: selectedEvents },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(
    {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.is_active,
      createdAt: webhook.created_at,
    },
    201
  );
}

// GET /api/v1/webhooks — List webhook endpoints
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const supabase = getServiceClient();

  const { data: webhooks, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("merchant_id", auth.merchantId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(`Failed to fetch webhooks: ${error.message}`, 500);
  }

  return apiSuccess({
    data: (webhooks ?? []).map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: wh.events,
      isActive: wh.is_active,
      createdAt: wh.created_at,
    })),
  });
}
