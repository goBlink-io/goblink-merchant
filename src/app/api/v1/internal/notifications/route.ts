import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/internal/notifications — list unread + recent (last 20)
export async function GET() {
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

  // Fetch recent notifications (last 20)
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return apiError(error.message, 500);

  // Count unread
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .is("read_at", null);

  return apiSuccess({
    notifications: notifications ?? [],
    unread_count: count ?? 0,
  });
}
