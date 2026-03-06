import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getAllTemplates } from "@/lib/admin/template-queries";

export async function GET() {
  // Verify admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceClient();
  const { data: admin } = await svc
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await getAllTemplates();
  return NextResponse.json({ templates });
}
