import { getServiceClient } from "@/lib/service-client";
import type {
  AdminTicket,
  AdminTicketDetail,
  Ticket,
  TicketMessage,
} from "@/lib/tickets/types";

const svc = () => getServiceClient();

// ============================================================
// List all tickets (admin)
// ============================================================

export async function getAllTickets(params: {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
}): Promise<AdminTicket[]> {
  const client = svc();

  let query = client
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.priority && params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }
  if (params.category && params.category !== "all") {
    query = query.eq("category", params.category);
  }
  if (params.assignedTo === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (params.assignedTo && params.assignedTo !== "all") {
    query = query.eq("assigned_to", params.assignedTo);
  }

  const { data: tickets } = await query;
  if (!tickets || tickets.length === 0) return [];

  // Enrich with merchant names + emails
  const merchantIds = [...new Set(tickets.map((t) => t.merchant_id))];
  const { data: merchants } = await client
    .from("merchants")
    .select("id, business_name, country, user_id")
    .in("id", merchantIds);

  const { data: authUsers } = await client.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email ?? "");
    }
  }

  const merchantMap = new Map<string, { name: string; email: string; country: string }>();
  merchants?.forEach((m) =>
    merchantMap.set(m.id, {
      name: m.business_name,
      email: emailMap.get(m.user_id) ?? "",
      country: m.country,
    })
  );

  // Enrich with assigned admin names
  const adminIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
  const adminNameMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await client
      .from("admins")
      .select("id, user_id")
      .in("id", adminIds);

    if (admins) {
      for (const a of admins) {
        const email = emailMap.get(a.user_id);
        adminNameMap.set(a.id, email ? email.split("@")[0] : "Admin");
      }
    }
  }

  // Get last message timestamps
  const ticketIds = tickets.map((t) => t.id);
  const { data: messages } = await client
    .from("ticket_messages")
    .select("ticket_id, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false });

  const lastMessageMap = new Map<string, string>();
  messages?.forEach((m) => {
    if (!lastMessageMap.has(m.ticket_id)) {
      lastMessageMap.set(m.ticket_id, m.created_at);
    }
  });

  // Search filter (client-side on subject/merchant name)
  let enriched: AdminTicket[] = tickets.map((t) => {
    const merchant = merchantMap.get(t.merchant_id);
    return {
      ...t,
      merchant_name: merchant?.name ?? "Unknown",
      merchant_email: merchant?.email ?? "",
      merchant_country: merchant?.country ?? "",
      assigned_admin_name: t.assigned_to ? (adminNameMap.get(t.assigned_to) ?? "Admin") : undefined,
      last_message_at: lastMessageMap.get(t.id),
    };
  });

  if (params.search) {
    const q = params.search.toLowerCase();
    enriched = enriched.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        (t.merchant_name?.toLowerCase().includes(q) ?? false) ||
        t.id.toLowerCase().includes(q)
    );
  }

  return enriched;
}

// ============================================================
// Get single ticket with messages (admin)
// ============================================================

export async function getAdminTicketDetail(
  ticketId: string
): Promise<AdminTicketDetail | null> {
  const client = svc();

  const { data: ticket } = await client
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return null;

  const [messagesRes, merchantRes, relatedRes] = await Promise.all([
    client
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    client
      .from("merchants")
      .select("id, business_name, country, user_id")
      .eq("id", ticket.merchant_id)
      .single(),
    client
      .from("tickets")
      .select("*")
      .eq("merchant_id", ticket.merchant_id)
      .neq("id", ticketId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const { data: authUsers } = await client.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email ?? "");
    }
  }

  let assignedAdminName: string | undefined;
  if (ticket.assigned_to) {
    const { data: admin } = await client
      .from("admins")
      .select("id, user_id")
      .eq("id", ticket.assigned_to)
      .single();
    if (admin) {
      assignedAdminName = emailMap.get(admin.user_id)?.split("@")[0] ?? "Admin";
    }
  }

  return {
    ...ticket,
    merchant_name: merchantRes.data?.business_name ?? "Unknown",
    merchant_email: merchantRes.data ? (emailMap.get(merchantRes.data.user_id) ?? "") : "",
    merchant_country: merchantRes.data?.country ?? "",
    assigned_admin_name: assignedAdminName,
    messages: (messagesRes.data ?? []) as TicketMessage[],
    related_tickets: (relatedRes.data ?? []) as Ticket[],
  };
}

// ============================================================
// Update ticket (admin)
// ============================================================

export async function updateTicket(
  ticketId: string,
  updates: { status?: string; priority?: string; assigned_to?: string | null }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.status === "resolved" || updates.status === "closed") {
    updateData.resolved_at = new Date().toISOString();
  }

  await svc().from("tickets").update(updateData).eq("id", ticketId);
}

// ============================================================
// Add message (admin)
// ============================================================

export async function addAdminMessage(
  ticketId: string,
  adminId: string,
  message: string
): Promise<void> {
  const client = svc();

  await Promise.all([
    client.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_type: "admin",
      sender_id: adminId,
      message,
    }),
    client
      .from("tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId),
  ]);
}

// ============================================================
// Ticket stats (admin)
// ============================================================

export async function getTicketStats(): Promise<{
  open: number;
  in_progress: number;
  waiting_on_merchant: number;
  unresolved_48h: number;
}> {
  const client = svc();

  const [openRes, inProgressRes, waitingRes, unresolvedRes] = await Promise.all([
    client
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    client
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    client
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting_on_merchant"),
    (() => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return client
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"])
        .lte("created_at", twoDaysAgo.toISOString());
    })(),
  ]);

  return {
    open: openRes.count ?? 0,
    in_progress: inProgressRes.count ?? 0,
    waiting_on_merchant: waitingRes.count ?? 0,
    unresolved_48h: unresolvedRes.count ?? 0,
  };
}

// ============================================================
// Open ticket count (for admin sidebar badge)
// ============================================================

export async function getOpenTicketCount(): Promise<number> {
  const { count } = await svc()
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress", "waiting_on_merchant"]);

  return count ?? 0;
}

// ============================================================
// Get all admins (for assignment dropdown)
// ============================================================

export async function getAllAdmins(): Promise<{ id: string; name: string }[]> {
  const client = svc();

  const { data: admins } = await client.from("admins").select("id, user_id");
  if (!admins || admins.length === 0) return [];

  const { data: authUsers } = await client.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email ?? "");
    }
  }

  return admins.map((a) => ({
    id: a.id,
    name: emailMap.get(a.user_id)?.split("@")[0] ?? "Admin",
  }));
}
