import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getTemplateById, getSampleVariables } from "@/lib/admin/template-queries";
import { renderTemplate } from "@/lib/email/sender";
import { sendEmail } from "@/lib/email/client";

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

  const variables = getSampleVariables(template.type);
  const subject = renderTemplate(template.subject, variables) + " [TEST]";
  const html = renderTemplate(template.body_html, variables);
  const text = renderTemplate(template.body_text, variables);

  const result = await sendEmail({
    to: user.email!,
    subject,
    html,
    text,
  });

  if (!result.success) {
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: user.email });
}
