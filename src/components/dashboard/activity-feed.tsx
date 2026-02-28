"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Key,
  Settings,
  CreditCard,
  Plug,
  FileText,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface ActivityFeedProps {
  logs: AuditLog[];
  totalCount: number;
  currentPage: number;
  perPage: number;
}

const actionConfig: Record<
  string,
  { label: string; icon: LucideIcon; color: string; href?: (id: string) => string }
> = {
  "api_key.created": {
    label: "API key created",
    icon: Key,
    color: "text-emerald-400",
  },
  "api_key.deleted": {
    label: "API key deleted",
    icon: Key,
    color: "text-red-400",
  },
  "settings.updated": {
    label: "Settings updated",
    icon: Settings,
    color: "text-blue-400",
  },
  "webhook.created": {
    label: "Webhook endpoint created",
    icon: Plug,
    color: "text-emerald-400",
  },
  "webhook.deleted": {
    label: "Webhook endpoint deleted",
    icon: Plug,
    color: "text-red-400",
  },
  "payment.refunded": {
    label: "Payment refunded",
    icon: RefreshCw,
    color: "text-purple-400",
    href: (id) => `/dashboard/payments/${id}`,
  },
  "payment.partially_refunded": {
    label: "Payment partially refunded",
    icon: RefreshCw,
    color: "text-purple-400",
    href: (id) => `/dashboard/payments/${id}`,
  },
  "payment.confirmed": {
    label: "Payment confirmed",
    icon: CreditCard,
    color: "text-emerald-400",
    href: (id) => `/dashboard/payments/${id}`,
  },
  "invoice.created": {
    label: "Invoice created",
    icon: FileText,
    color: "text-blue-400",
    href: (id) => `/dashboard/invoices/${id}`,
  },
  "invoice.sent": {
    label: "Invoice sent",
    icon: Send,
    color: "text-blue-400",
    href: (id) => `/dashboard/invoices/${id}`,
  },
  "invoice.marked_paid": {
    label: "Invoice marked as paid",
    icon: CheckCircle,
    color: "text-emerald-400",
    href: (id) => `/dashboard/invoices/${id}`,
  },
  "invoice.updated": {
    label: "Invoice updated",
    icon: FileText,
    color: "text-yellow-400",
    href: (id) => `/dashboard/invoices/${id}`,
  },
  "invoice.deleted": {
    label: "Invoice deleted",
    icon: Trash2,
    color: "text-red-400",
  },
};

function getActionConfig(action: string) {
  return (
    actionConfig[action] ?? {
      label: action.replace(/[._]/g, " "),
      icon: Activity,
      color: "text-zinc-400",
    }
  );
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatAbsolute(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function ActivityFeed({
  logs,
  totalCount,
  currentPage,
  perPage,
}: ActivityFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(totalCount / perPage);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    router.push(`/dashboard/activity?${params.toString()}`);
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Activity className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No activity yet</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Actions on your account will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-800/50">
            {logs.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              const linkHref =
                config.href && log.resource_id
                  ? config.href(log.resource_id)
                  : null;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      {linkHref ? (
                        <Link
                          href={linkHref}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {config.label}
                        </Link>
                      ) : (
                        config.label
                      )}
                    </p>
                    {log.resource_id && (
                      <p className="text-xs text-zinc-500 font-mono truncate mt-0.5">
                        {log.resource_type}: {log.resource_id.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs text-zinc-500 shrink-0"
                    title={formatAbsolute(log.created_at)}
                  >
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing {(currentPage - 1) * perPage + 1}–
            {Math.min(currentPage * perPage, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
