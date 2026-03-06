import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getTemplateById } from "@/lib/admin/template-queries";
import { clearTemplateCache } from "@/lib/email/sender";
import { getDefaultTemplate } from "@/lib/email/default-templates";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const defaults = getDefaultTemplate(template.type);
  if (!defaults) {
    return NextResponse.json({ error: "No default template found for this type" }, { status: 404 });
  }

  const { data: updated, error } = await svc
    .from("email_templates")
    .update({
      subject: defaults.subject,
      body_html: defaults.body_html,
      body_text: defaults.body_text,
      is_active: true,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to reset template" }, { status: 500 });
  }

  clearTemplateCache();

  return NextResponse.json({ template: updated });
}
