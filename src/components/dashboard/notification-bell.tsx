"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, CreditCard, AlertTriangle, MessageSquare, Webhook, Info, PartyPopper, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  payment_received: CreditCard,
  payment_failed: AlertTriangle,
  ticket_reply: MessageSquare,
  webhook_failed: Webhook,
  system: Info,
  first_payment: PartyPopper,
  milestone: Trophy,
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/internal/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silently fail
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Supabase Realtime subscription for instant updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    await fetch(`/api/v1/internal/notifications/${id}/read`, {
      method: "PATCH",
    });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch("/api/v1/internal/notifications/read-all", {
      method: "PATCH",
    });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  function handleClick(notification: Notification) {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-200">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 max-h-[28rem] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-zinc-200 h-7 px-2"
              onClick={markAllRead}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">No notifications</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              const isUnread = !n.read_at;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0 ${
                    isUnread ? "bg-zinc-800/20" : ""
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isUnread ? "text-blue-400" : "text-zinc-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-tight ${
                          isUnread
                            ? "font-medium text-zinc-100"
                            : "text-zinc-400"
                        }`}
                      >
                        {n.title}
                      </p>
                      {isUnread && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
