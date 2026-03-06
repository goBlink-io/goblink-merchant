import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { getInvoiceById } from "@/lib/invoices/queries";
import { sendEmail } from "@/lib/email/client";
import { InvoiceSentEmail } from "@/lib/email/templates/invoice-sent";
import * as React from "react";

// POST — Send invoice email (session-authenticated)
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

  if (!invoice.recipient_email) {
    return apiError("Invoice has no recipient email", 400);
  }

  // Rate limit: 3 sends per hour per merchant+recipient (M22)
  const rl = await checkRateLimit(request, "invoice-send", `${merchant.id}:${invoice.recipient_email}`);
  if (!rl.allowed) return rl.response!;

  if (invoice.status === "paid") {
    return apiError("Invoice is already paid", 400);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";
  const payUrl = invoice.payment_id
    ? `${appUrl}/pay/${invoice.payment_id}`
    : `${appUrl}/dashboard/invoices/${invoice.id}`;

  // Send email
  await sendEmail({
    to: invoice.recipient_email,
    subject: `Invoice ${invoice.invoice_number} from goBlink Merchant`,
    react: React.createElement(InvoiceSentEmail, {
      invoiceNumber: invoice.invoice_number,
      recipientName: invoice.recipient_name || "",
      total: String(invoice.total),
      currency: invoice.currency,
      dueDate: invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "Upon receipt",
      memo: invoice.memo,
      payUrl,
    }),
  });

  // Update status to sent
  const serviceClient = getServiceClient();
  const { data: updated, error } = await serviceClient
    .from("invoices")
    .update({
      status: invoice.status === "draft" ? "sent" : invoice.status,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .select("*")
    .single();

  if (error) {
    return apiError(`Failed to update invoice status: ${error.message}`, 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "invoice.sent",
    resourceType: "invoice",
    resourceId: id,
    metadata: { recipientEmail: invoice.recipient_email },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(updated);
}
