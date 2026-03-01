import { NextRequest } from "next/server";
import { validateApiKey, isApiForbidden } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

// DELETE /api/v1/webhooks/:id — Remove a webhook endpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateApiKey(request.headers.get("authorization"), request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"));
  if (isApiForbidden(auth)) {
    return apiError("IP address not allowed for this API key", 403);
  }
  if (!auth) {
    return apiError("Invalid or missing API key", 401);
  }

  const supabase = getServiceClient();

  // Verify webhook belongs to this merchant
  const { data: webhook, error: fetchError } = await supabase
    .from("webhook_endpoints")
    .select("id")
    .eq("id", id)
    .eq("merchant_id", auth.merchantId)
    .single();

  if (fetchError || !webhook) {
    return apiError("Webhook endpoint not found", 404);
  }

  const { error } = await supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", id);

  if (error) {
    return apiError(`Failed to delete webhook: ${error.message}`, 500);
  }

  logAudit({
    merchantId: auth.merchantId,
    actor: auth.keyId,
    action: "webhook.deleted",
    resourceType: "webhook",
    resourceId: id,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess({ deleted: true });
}
