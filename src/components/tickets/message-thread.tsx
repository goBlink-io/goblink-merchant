"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { TicketMessage } from "@/lib/tickets/types";
import { User, Shield } from "lucide-react";

interface MessageThreadProps {
  messages: TicketMessage[];
  currentUserType: "merchant" | "admin";
}

export function MessageThread({ messages, currentUserType }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-8">No messages yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isSelf =
          (currentUserType === "merchant" && msg.sender_type === "merchant") ||
          (currentUserType === "admin" && msg.sender_type === "admin");
        const isAdmin = msg.sender_type === "admin";

        return (
          <div
            key={msg.id}
            className={cn("flex", isSelf ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-4 py-3 space-y-1",
                isSelf
                  ? "bg-blue-600/20 border border-blue-500/20"
                  : "bg-zinc-800 border border-zinc-700"
              )}
            >
              <div className="flex items-center gap-2 text-xs">
                {isAdmin ? (
                  <>
                    <Shield className="h-3 w-3 text-violet-400" />
                    <span className="text-violet-400 font-medium">Support Team</span>
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 text-blue-400" />
                    <span className="text-blue-400 font-medium">You</span>
                  </>
                )}
                <span className="text-zinc-500">{formatDate(msg.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{msg.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
