import { createClient } from "@/lib/supabase/server";
import type { Ticket, TicketWithMessages } from "./types";

// Uses RLS — merchant only sees their own tickets

export async function getMerchantTickets(status?: string): Promise<Ticket[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getMerchantTicketWithMessages(
  ticketId: string
): Promise<TicketWithMessages | null> {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return null;

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return { ...ticket, messages: messages ?? [] };
}

export async function getMerchantUnresolvedCount(): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress", "waiting_on_merchant"]);

  return count ?? 0;
}
