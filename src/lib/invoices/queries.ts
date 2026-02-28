import { getServiceClient } from "@/lib/service-client";

interface InvoiceFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceRow {
  id: string;
  merchant_id: string;
  invoice_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  subtotal: number;
  tax_rate: number;
  tax_total: number;
  total: number;
  currency: string;
  status: string;
  due_date: string | null;
  memo: string | null;
  payment_terms: string | null;
  payment_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedInvoices {
  data: InvoiceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getInvoices(
  merchantId: string,
  filters: InvoiceFilters = {}
): Promise<PaginatedInvoices> {
  const supabase = getServiceClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(
      `invoice_number.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,recipient_email.ilike.%${filters.search}%`
    );
  }

  const { count } = await query;

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data as InvoiceRow[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getInvoiceById(
  invoiceId: string,
  merchantId: string
): Promise<InvoiceRow | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("merchant_id", merchantId)
    .single();

  if (error || !data) return null;

  return data as InvoiceRow;
}

export async function getNextInvoiceNumber(merchantId: string): Promise<string> {
  const supabase = getServiceClient();

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return "INV-001";
  }

  const lastNumber = data[0].invoice_number;
  const match = lastNumber.match(/INV-(\d+)/);
  if (!match) return "INV-001";

  const next = parseInt(match[1], 10) + 1;
  return `INV-${String(next).padStart(3, "0")}`;
}
