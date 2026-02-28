import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  const page = parseInt(params.page || "1", 10);
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="text-zinc-400 mt-1">
          A log of all actions taken on your account.
        </p>
      </div>

      <ActivityFeed
        logs={logs ?? []}
        totalCount={count ?? 0}
        currentPage={page}
        perPage={perPage}
      />
    </div>
  );
}
