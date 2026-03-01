import { getServiceClient } from "@/lib/service-client";

export type NotificationType =
  | "payment_received"
  | "payment_failed"
  | "ticket_reply"
  | "webhook_failed"
  | "system"
  | "first_payment"
  | "milestone";

/**
 * Insert an in-app notification for a merchant.
 * Uses the service client (bypasses RLS) so it can be called from cron/server contexts.
 */
export async function insertNotification(
  merchantId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.from("notifications").insert({
    merchant_id: merchantId,
    type,
    title,
    body,
    link: link ?? null,
  });

  if (error) {
    console.error("[notifications] Failed to insert notification:", error.message);
  }
}
