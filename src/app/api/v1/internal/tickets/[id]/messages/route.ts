import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

  // Verify the ticket belongs to this merchant (RLS handles this)
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!ticket) return NextResponse.json({ error: { message: "Ticket not found" } }, { status: 404 });

  const body = await request.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: { message: "Message is required" } }, { status: 400 });
  }

  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: id,
    sender_type: "merchant",
    sender_id: user.id,
    message,
  });

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });

  // If ticket was resolved/closed, reopen it
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await supabase
      .from("tickets")
      .update({ status: "open", resolved_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await supabase
      .from("tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
