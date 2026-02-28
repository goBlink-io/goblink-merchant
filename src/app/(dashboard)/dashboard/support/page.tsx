import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/admin/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { TicketPriorityBadge } from "@/components/tickets/priority-badge";
import { TicketCategoryBadge } from "@/components/tickets/category-badge";
import { TicketForm } from "@/components/tickets/ticket-form";
import { formatDate } from "@/lib/utils";
import { getMerchantTickets } from "@/lib/tickets/queries";
import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/lib/tickets/types";

export const dynamic = "force-dynamic";

async function TicketsList({ status }: { status?: string }) {
  const tickets = await getMerchantTickets(status);

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <LifeBuoy className="h-12 w-12 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-lg">No tickets yet.</p>
            <p className="text-zinc-500 text-sm">Need help? Create a ticket!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">Your Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/support/${ticket.id}`}
                    className="text-white hover:text-blue-400 font-medium"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <TicketCategoryBadge category={ticket.category as TicketCategory} />
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={ticket.status as TicketStatus} />
                </TableCell>
                <TableCell>
                  <TicketPriorityBadge priority={ticket.priority as TicketPriority} />
                </TableCell>
                <TableCell className="text-zinc-500 text-xs">
                  {formatDate(ticket.created_at)}
                </TableCell>
                <TableCell className="text-zinc-500 text-xs">
                  {formatDate(ticket.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support</h1>
          <p className="text-zinc-400 mt-1">Get help with your account or report issues.</p>
        </div>
        <TicketForm />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "waiting_on_merchant", label: "Waiting on You" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ].map((s) => (
          <Link
            key={s.value}
            href={`/dashboard/support${s.value !== "all" ? `?status=${s.value}` : ""}`}
          >
            <Badge
              variant={
                (params.status || "all") === s.value ? "default" : "outline"
              }
              className="cursor-pointer"
            >
              {s.label}
            </Badge>
          </Link>
        ))}
      </div>

      <Suspense fallback={<TableSkeleton rows={5} />}>
        <TicketsList status={params.status} />
      </Suspense>
    </div>
  );
}
