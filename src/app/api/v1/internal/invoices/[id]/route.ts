import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { getInvoiceById } from "@/lib/invoices/queries";

// GET — Get single invoice (session-authenticated)
export async function GET(
  _request: NextRequest,
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

  return apiSuccess(invoice);
}

// PATCH — Update invoice (only if draft, session-authenticated)
export async function PATCH(
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

  const existing = await getInvoiceById(id, merchant.id);
  if (!existing) return apiError("Invoice not found", 404);
  if (existing.status !== "draft") {
    return apiError("Only draft invoices can be updated", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.recipient_name !== undefined) updates.recipient_name = body.recipient_name;
  if (body.recipient_email !== undefined) updates.recipient_email = body.recipient_email;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.currency !== undefined) updates.currency = (body.currency as string).toUpperCase();

  // Recalculate if line items or tax rate changed
  if (body.line_items || body.tax_rate !== undefined) {
    const lineItems = (body.line_items as Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>) || existing.line_items;

    const computedItems = lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: Math.round(item.quantity * item.unit_price * 100) / 100,
    }));

    const subtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
    const rate = body.tax_rate !== undefined ? (body.tax_rate as number) : existing.tax_rate;
    const taxTotal = Math.round(subtotal * (rate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxTotal) * 100) / 100;

    updates.line_items = computedItems;
    updates.subtotal = subtotal;
    updates.tax_rate = rate;
    updates.tax_total = taxTotal;
    updates.total = total;
  }

  const serviceClient = getServiceClient();
  const { data: invoice, error } = await serviceClient
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .select("*")
    .single();

  if (error || !invoice) {
    return apiError(`Failed to update invoice: ${error?.message}`, 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "invoice.updated",
    resourceType: "invoice",
    resourceId: id,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(invoice);
}

// DELETE — Delete invoice (only if draft, session-authenticated)
export async function DELETE(
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

  const existing = await getInvoiceById(id, merchant.id);
  if (!existing) return apiError("Invoice not found", 404);
  if (existing.status !== "draft") {
    return apiError("Only draft invoices can be deleted", 400);
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("merchant_id", merchant.id);

  if (error) {
    return apiError("Failed to delete invoice", 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "invoice.deleted",
    resourceType: "invoice",
    resourceId: id,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess({ deleted: true });
}
