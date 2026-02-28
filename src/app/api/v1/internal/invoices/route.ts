import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { getInvoices, getNextInvoiceNumber } from "@/lib/invoices/queries";

// GET — List invoices (session-authenticated)
export async function GET(request: NextRequest) {
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

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  try {
    const result = await getInvoices(merchant.id, { status, search, page, limit });
    return apiSuccess(result);
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}

// POST — Create invoice (session-authenticated)
export async function POST(request: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const {
    recipient_name,
    recipient_email,
    line_items,
    tax_rate,
    due_date,
    memo,
    currency,
  } = body as {
    recipient_name?: string;
    recipient_email?: string;
    line_items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
    tax_rate?: number;
    due_date?: string;
    memo?: string;
    currency?: string;
  };

  if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
    return apiError("line_items is required and must be non-empty", 400);
  }

  // Calculate amounts
  const computedItems = line_items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: Math.round(item.quantity * item.unit_price * 100) / 100,
  }));

  const subtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
  const rate = tax_rate ?? 0;
  const taxTotal = Math.round(subtotal * (rate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxTotal) * 100) / 100;

  const invoiceNumber = await getNextInvoiceNumber(merchant.id);

  const serviceClient = getServiceClient();
  const { data: invoice, error } = await serviceClient
    .from("invoices")
    .insert({
      merchant_id: merchant.id,
      invoice_number: invoiceNumber,
      recipient_name: recipient_name || null,
      recipient_email: recipient_email || null,
      line_items: computedItems,
      subtotal,
      tax_rate: rate,
      tax_total: taxTotal,
      total,
      currency: (currency || "USD").toUpperCase(),
      status: "draft",
      due_date: due_date || null,
      memo: memo || null,
    })
    .select("*")
    .single();

  if (error || !invoice) {
    return apiError(`Failed to create invoice: ${error?.message}`, 500);
  }

  logAudit({
    merchantId: merchant.id,
    actor: user.id,
    action: "invoice.created",
    resourceType: "invoice",
    resourceId: invoice.id,
    metadata: { invoiceNumber, total },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess(invoice, 201);
}
