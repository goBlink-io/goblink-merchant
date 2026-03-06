import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getAllTemplates } from "@/lib/admin/template-queries";
import { redirect } from "next/navigation";
import { TemplateList } from "./template-list";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  // Verify admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = getServiceClient();
  const { data: admin } = await svc
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) redirect("/dashboard");

  const templates = await getAllTemplates();

  return <TemplateList templates={templates} />;
}
