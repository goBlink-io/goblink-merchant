import { getServiceClient } from "@/lib/service-client";

interface AuditParams {
  merchantId: string;
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit event. Fire-and-forget — does not throw on failure.
 */
export function logAudit(params: AuditParams): void {
  const supabase = getServiceClient();

  supabase
    .from("audit_logs")
    .insert({
      merchant_id: params.merchantId,
      actor: params.actor,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("[audit] Failed to log:", error.message, params.action);
      }
    });
}
