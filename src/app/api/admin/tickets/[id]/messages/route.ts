import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { addAdminMessage } from "@/lib/admin/ticket-queries";
import { insertNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const body = await request.json();
  const { message } = body;

  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  await addAdminMessage(id, admin.id, message);

  // Notify the merchant about the reply
  const { data: ticket } = await svc
    .from("tickets")
    .select("merchant_id, subject")
    .eq("id", id)
    .single();

  if (ticket) {
    insertNotification(
      ticket.merchant_id,
      "ticket_reply",
      "New reply on your ticket",
      `Your ticket "${ticket.subject}" has a new response.`,
      `/dashboard/support/${id}`
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
