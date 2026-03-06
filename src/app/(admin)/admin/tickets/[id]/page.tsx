import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/admin/loading";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { TicketPriorityBadge } from "@/components/tickets/priority-badge";
import { TicketCategoryBadge } from "@/components/tickets/category-badge";
import { MessageThread } from "@/components/tickets/message-thread";
import { getAdminTicketDetail, getAllAdmins } from "@/lib/admin/ticket-queries";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, User, Mail, Globe, Clock, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTicketActions } from "./actions";
import { AdminReplyForm } from "./reply-form";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/lib/tickets/types";

export const dynamic = "force-dynamic";

async function TicketDetail({ id }: { id: string }) {
  const [ticket, admins] = await Promise.all([
    getAdminTicketDetail(id),
    getAllAdmins(),
  ]);

  if (!ticket) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content — 2 cols */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket header */}
        <Card>
          <CardHeader>
            <div className="space-y-3">
              <CardTitle className="text-white text-xl">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <TicketStatusBadge status={ticket.status as TicketStatus} />
                <TicketPriorityBadge priority={ticket.priority as TicketPriority} />
                <TicketCategoryBadge category={ticket.category as TicketCategory} />
                <span className="text-xs text-zinc-500">
                  Created {formatDate(ticket.created_at)}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Admin actions */}
        <AdminTicketActions
          ticketId={ticket.id}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          currentAssignedTo={ticket.assigned_to}
          admins={admins}
        />

        {/* Message thread */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white text-sm">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageThread messages={ticket.messages} currentUserType="admin" />
          </CardContent>
        </Card>

        {/* Reply form */}
        <AdminReplyForm ticketId={ticket.id} />
      </div>

      {/* Sidebar — 1 col */}
      <div className="space-y-6">
        {/* Merchant info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white text-sm">Merchant Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-300">{ticket.merchant_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-400">{ticket.merchant_email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-400">{ticket.merchant_country || "—"}</span>
            </div>
            <Link
              href={`/admin/merchants/${ticket.merchant_id}`}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              View Merchant Profile →
            </Link>
          </CardContent>
        </Card>

        {/* Ticket metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white text-sm">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">ID</span>
              <span className="font-mono text-zinc-300 text-xs">{ticket.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Created</span>
              <span className="text-zinc-300">{formatDate(ticket.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Updated</span>
              <span className="text-zinc-300">{formatDate(ticket.updated_at)}</span>
            </div>
            {ticket.resolved_at && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Resolved</span>
                <span className="text-zinc-300">{formatDate(ticket.resolved_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Assigned</span>
              <span className="text-zinc-300">{ticket.assigned_admin_name ?? "Unassigned"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Related tickets */}
        {ticket.related_tickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-white text-sm">
                Related Tickets ({ticket.related_tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.related_tickets.map((rt) => (
                <Link
                  key={rt.id}
                  href={`/admin/tickets/${rt.id}`}
                  className="block p-2 rounded-md hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="h-3 w-3 text-zinc-500" />
                    <span className="text-sm text-zinc-300 truncate">{rt.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <TicketStatusBadge status={rt.status as TicketStatus} />
                    <span className="text-xs text-zinc-500">{formatDate(rt.created_at)}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <Suspense fallback={<TableSkeleton rows={8} />}>
        <TicketDetailAsync params={params} />
      </Suspense>
    </div>
  );
}

async function TicketDetailAsync({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetail id={id} />;
}
