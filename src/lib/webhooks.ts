import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface WebhookEvent {
  event: string;
  paymentId?: string;
  merchantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  attempt: number = 1
): Promise<void> {
  const supabase = getServiceClient();
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(`${timestamp}.${payload}`, secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GoBlink-Signature": signature,
        "X-GoBlink-Timestamp": timestamp,
        "X-GoBlink-Event": event.event,
        "User-Agent": "goBlink-Webhook/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Unknown error";
  }

  // Log the delivery attempt
  await supabase.from("webhook_deliveries").insert({
    webhook_endpoint_id: endpointId,
    event: event.event,
    payload: event,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 1000) ?? null,
    attempt,
    delivered_at: responseStatus && responseStatus >= 200 && responseStatus < 300
      ? new Date().toISOString()
      : null,
  });

  // Retry on failure (up to 3 attempts)
  const isSuccess = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
  if (!isSuccess && attempt < 3) {
    const delays = [1000, 10000, 60000]; // 1s, 10s, 60s
    const delay = delays[attempt - 1] ?? 60000;
    setTimeout(() => {
      deliverWebhook(endpointId, url, secret, event, attempt + 1);
    }, delay);
  }
}

export async function dispatchWebhooks(
  merchantId: string,
  event: WebhookEvent
): Promise<void> {
  const supabase = getServiceClient();

  const { data: endpoints, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("merchant_id", merchantId)
    .eq("is_active", true);

  if (error || !endpoints) return;

  // Dispatch to all matching endpoints
  const promises = endpoints
    .filter((ep) => ep.events.includes(event.event) || ep.events.includes("*"))
    .map((ep) => deliverWebhook(ep.id, ep.url, ep.secret, event));

  // Fire and forget — don't block the response
  Promise.allSettled(promises);
}
