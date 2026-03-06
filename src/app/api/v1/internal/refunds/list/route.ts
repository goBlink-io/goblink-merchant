import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/internal/refunds/list — List all refunds for a merchant (session-authenticated)
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
  const isTest = url.searchParams.get("is_test") === "true";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = (page - 1) * limit;

  const serviceClient = getServiceClient();

  // Build query
  let query = serviceClient
    .from("refunds")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    // Search by payment_id prefix
    query = query.ilike("payment_id::text", `${search}%`);
  }

  // Filter by test mode: join payments to check is_test
  if (isTest) {
    // Get payment IDs that are test payments
    const { data: testPayments } = await serviceClient
      .from("payments")
      .select("id")
      .eq("merchant_id", merchant.id)
      .eq("is_test", true);

    const testIds = (testPayments ?? []).map((p: { id: string }) => p.id);
    if (testIds.length > 0) {
      query = query.in("payment_id", testIds);
    } else {
      return apiSuccess({ data: [], totalCount: 0, totalPages: 0 });
    }
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: refunds, error, count } = await query;

  if (error) {
    return apiError(`Failed to fetch refunds: ${error.message}`, 500);
  }

  const totalCount = count ?? 0;

  return apiSuccess({
    data: refunds ?? [],
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  });
}
