import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/tickets/status-badge";
import { TicketPriorityBadge } from "@/components/tickets/priority-badge";
import { TicketCategoryBadge } from "@/components/tickets/category-badge";
import { MessageThread } from "@/components/tickets/message-thread";
import { TicketReplyForm } from "./reply-form";
import { formatDate } from "@/lib/utils";
import { getMerchantTicketWithMessages } from "@/lib/tickets/queries";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/lib/tickets/types";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ticket = await getMerchantTicketWithMessages(id);
  if (!ticket) notFound();

  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/support"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Link>

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

      {/* Resolved banner */}
      {isResolved && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-emerald-400" />
          <p className="text-sm text-emerald-400">
            This ticket has been {ticket.status}. Replying will reopen it.
          </p>
        </div>
      )}

      {/* Message thread */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white text-sm">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread messages={ticket.messages} currentUserType="merchant" />
        </CardContent>
      </Card>

      {/* Reply form */}
      <TicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
