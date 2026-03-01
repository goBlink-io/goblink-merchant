import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-response";

// GET /api/v1/internal/milestones — list merchant milestones (most recent first)
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

  const { data: milestones, error } = await supabase
    .from("merchant_milestones")
    .select("milestone_key, achieved_at")
    .eq("merchant_id", merchant.id)
    .order("achieved_at", { ascending: false });

  if (error) return apiError(error.message, 500);

  return apiSuccess({ milestones: milestones ?? [] });
}
