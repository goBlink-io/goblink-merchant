import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getTemplateById, updateTemplate } from "@/lib/admin/template-queries";
import { clearTemplateCache } from "@/lib/email/sender";

async function verifyAdmin(): Promise<{ error?: NextResponse; userId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const svc = getServiceClient();
  const { data: admin } = await svc
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId: user.id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["subject", "body_html", "body_text", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const template = await updateTemplate(id, updates as {
    subject?: string;
    body_html?: string;
    body_text?: string;
    is_active?: boolean;
  });

  if (!template) {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }

  // Clear template cache so changes take effect immediately
  clearTemplateCache();

  return NextResponse.json({ template });
}
