import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: { message: "Merchant not found" } }, { status: 404 });

  const body = await request.json();
  const { category, priority, subject, description } = body;

  if (!subject || !description) {
    return NextResponse.json({ error: { message: "Subject and description are required" } }, { status: 400 });
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      merchant_id: merchant.id,
      category: category || "general",
      priority: priority || "medium",
      subject,
      description,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: { message: error.message } }, { status: 500 });

  // Add the description as the first message
  await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "merchant",
    sender_id: user.id,
    message: description,
  });

  return NextResponse.json(ticket, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ error: { message: "Merchant not found" } }, { status: 404 });

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(tickets ?? []);
}
