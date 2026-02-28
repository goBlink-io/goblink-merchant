import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { getAllTickets, getTicketStats } from "@/lib/admin/ticket-queries";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const assignedTo = url.searchParams.get("assigned_to") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  const [tickets, stats] = await Promise.all([
    getAllTickets({ status, priority, category, assignedTo, search }),
    getTicketStats(),
  ]);

  return NextResponse.json({ tickets, stats });
}
