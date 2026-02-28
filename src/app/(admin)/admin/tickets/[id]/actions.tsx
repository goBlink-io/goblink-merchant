"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AdminTicketActionsProps {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssignedTo: string | null;
  admins: { id: string; name: string }[];
}

export function AdminTicketActions({
  ticketId,
  currentStatus,
  currentPriority,
  currentAssignedTo,
  admins,
}: AdminTicketActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateTicket(updates: Record<string, string | null>) {
    setLoading(true);
    try {
      await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4 flex-wrap">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Status:</span>
            <Select
              value={currentStatus}
              onValueChange={(v) => updateTicket({ status: v })}
            >
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="open" className="text-zinc-200">Open</SelectItem>
                <SelectItem value="in_progress" className="text-zinc-200">In Progress</SelectItem>
                <SelectItem value="waiting_on_merchant" className="text-zinc-200">Waiting on Merchant</SelectItem>
                <SelectItem value="resolved" className="text-zinc-200">Resolved</SelectItem>
                <SelectItem value="closed" className="text-zinc-200">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Priority:</span>
            <Select
              value={currentPriority}
              onValueChange={(v) => updateTicket({ priority: v })}
            >
              <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="low" className="text-zinc-200">Low</SelectItem>
                <SelectItem value="medium" className="text-zinc-200">Medium</SelectItem>
                <SelectItem value="high" className="text-zinc-200">High</SelectItem>
                <SelectItem value="urgent" className="text-zinc-200">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Assign:</span>
            <Select
              value={currentAssignedTo ?? "unassigned"}
              onValueChange={(v) =>
                updateTicket({ assigned_to: v === "unassigned" ? null : v })
              }
            >
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="unassigned" className="text-zinc-200">Unassigned</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-zinc-200">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
