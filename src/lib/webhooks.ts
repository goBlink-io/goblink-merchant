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

/**
 * Deliver a webhook to a single endpoint. Logs the result to webhook_deliveries.
 * On failure, queues the next retry attempt as a row with delivered_at = null
 * (picked up by the retry-webhooks cron). No more setTimeout.
 */
export async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  attempt: number = 1
): Promise<{ success: boolean; status: number | null; body: string | null }> {
  const supabase = getServiceClient();
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(`${timestamp}.${payload}`, secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

  const isSuccess = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

  // Log this delivery attempt
  await supabase.from("webhook_deliveries").insert({
    webhook_endpoint_id: endpointId,
    event: event.event,
    payload: event,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 1000) ?? null,
    attempt,
    delivered_at: isSuccess ? new Date().toISOString() : null,
  });

  // On failure, queue the next retry as a pending row (picked up by cron)
  if (!isSuccess && attempt < 3) {
    await supabase.from("webhook_deliveries").insert({
      webhook_endpoint_id: endpointId,
      event: event.event,
      payload: event,
      response_status: null,
      response_body: null,
      attempt: attempt + 1,
      delivered_at: null,
    });
  }

  return { success: isSuccess, status: responseStatus, body: responseBody };
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

  const promises = endpoints
    .filter((ep) => ep.events.includes(event.event) || ep.events.includes("*"))
    .map((ep) => deliverWebhook(ep.id, ep.url, ep.secret, event));

  // Await deliveries so they complete before the serverless function dies
  await Promise.allSettled(promises);
}

/**
 * Process a single pending retry delivery row. Fetches the endpoint,
 * sends the webhook, and updates the row with the result.
 */
export async function processRetryDelivery(delivery: {
  id: string;
  webhook_endpoint_id: string;
  event: string;
  payload: WebhookEvent;
  attempt: number;
}): Promise<boolean> {
  const supabase = getServiceClient();

  // Fetch the endpoint (need url + secret)
  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, is_active")
    .eq("id", delivery.webhook_endpoint_id)
    .single();

  if (!endpoint || !endpoint.is_active) {
    // Endpoint deleted or deactivated — mark as failed
    await supabase
      .from("webhook_deliveries")
      .update({
        response_status: null,
        response_body: "Endpoint not found or inactive",
        delivered_at: null,
      })
      .eq("id", delivery.id);
    return false;
  }

  const payload = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(`${timestamp}.${payload}`, endpoint.secret);

  let responseStatus: number | null = null;
  let responseBody: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GoBlink-Signature": signature,
        "X-GoBlink-Timestamp": timestamp,
        "X-GoBlink-Event": delivery.event,
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

  const isSuccess = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

  // Update the pending retry row with the result
  await supabase
    .from("webhook_deliveries")
    .update({
      response_status: responseStatus,
      response_body: responseBody?.slice(0, 1000) ?? null,
      delivered_at: isSuccess ? new Date().toISOString() : null,
    })
    .eq("id", delivery.id);

  // Queue next retry if still failing
  if (!isSuccess && delivery.attempt < 3) {
    await supabase.from("webhook_deliveries").insert({
      webhook_endpoint_id: delivery.webhook_endpoint_id,
      event: delivery.event,
      payload: delivery.payload,
      response_status: null,
      response_body: null,
      attempt: delivery.attempt + 1,
      delivered_at: null,
    });
  }

  return isSuccess;
}
