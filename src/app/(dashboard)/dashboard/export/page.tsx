import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExportContent } from "@/components/dashboard/export-content";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const supabase = await createClient();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Export</h1>
        <p className="text-zinc-400 mt-1">
          Download transaction data and tax summaries.
        </p>
      </div>

      <ExportContent />
    </div>
  );
}
