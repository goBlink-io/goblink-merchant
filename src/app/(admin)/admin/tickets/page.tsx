import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGridSkeleton, TableSkeleton } from "@/components/admin/loading";
import { StatCard } from "@/components/admin/stat-card";
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
import { getAllTickets, getTicketStats } from "@/lib/admin/ticket-queries";
import { formatDate } from "@/lib/utils";
import { Ticket, AlertCircle, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AdminTicketFilters } from "./filters";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/lib/tickets/types";

export const dynamic = "force-dynamic";

async function TicketStatsRow() {
  const stats = await getTicketStats();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Open" value={String(stats.open)} icon={Ticket} />
      <StatCard title="In Progress" value={String(stats.in_progress)} icon={Clock} />
      <StatCard title="Waiting on Merchant" value={String(stats.waiting_on_merchant)} icon={MessageSquare} />
      <StatCard title="Unresolved >48h" value={String(stats.unresolved_48h)} icon={AlertCircle} />
    </div>
  );
}

async function TicketsTable({
  status,
  priority,
  category,
  assignedTo,
  search,
}: {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
}) {
  const tickets = await getAllTickets({ status, priority, category, assignedTo, search });

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-zinc-500">No tickets found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">Tickets ({tickets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/admin/tickets/${ticket.id}`}
                    className="text-white hover:text-violet-400"
                  >
                    {ticket.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">{ticket.merchant_name}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/tickets/${ticket.id}`}
                    className="text-white hover:text-violet-400 font-medium"
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
                <TableCell className="text-sm text-zinc-400">
                  {ticket.assigned_admin_name ?? "—"}
                </TableCell>
                <TableCell className="text-zinc-500 text-xs">
                  {formatDate(ticket.created_at)}
                </TableCell>
                <TableCell className="text-zinc-500 text-xs">
                  {ticket.last_message_at ? formatDate(ticket.last_message_at) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tickets</h1>
        <p className="text-zinc-400 mt-1">Manage support tickets from merchants</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton count={4} />}>
        <TicketStatsRow />
      </Suspense>

      <AdminTicketFilters
        currentStatus={params.status || "all"}
        currentPriority={params.priority || "all"}
        currentCategory={params.category || "all"}
        currentAssigned={params.assigned_to || "all"}
        currentSearch={params.search || ""}
      />

      <Suspense fallback={<TableSkeleton rows={10} />}>
        <TicketsTable
          status={params.status}
          priority={params.priority}
          category={params.category}
          assignedTo={params.assigned_to}
          search={params.search}
        />
      </Suspense>
    </div>
  );
}
