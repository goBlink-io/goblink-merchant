import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { getInvoiceById } from "@/lib/invoices/queries";

// POST — Mark invoice as paid (session-authenticated)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("Unauthorized", 401);

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return apiError("Merchant not found", 404);

  const invoice = await getInvoiceById(id, merchant.id);
  if (!invoice) return apiError("Invoice not found", 404);

  if (invoice.status === "paid") {
    return apiError("Invoice is already paid", 400);
  }

  const serviceClient = getServiceClient();
  const { data: updated, error } = await serviceClient
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError(`Failed to mark invoice as paid: ${error?.message}`, 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "invoice.marked_paid",
    resourceType: "invoice",
    resourceId: id,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(updated);
}
