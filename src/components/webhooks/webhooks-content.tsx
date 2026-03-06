"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/dashboard/copy-button";
import { DeliveryDetail } from "./delivery-detail";
import { StatusBadge } from "./status-badge";
import { EventBadge } from "./event-badge";
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  Loader2,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_endpoint_id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
  webhook_endpoints?: {
    id: string;
    url: string;
    events: string[];
  };
}

interface WebhooksContentProps {
  merchantId: string;
  webhooks: WebhookEndpoint[];
}

const EVENT_OPTIONS = [
  "payment.created",
  "payment.processing",
  "payment.confirmed",
  "payment.failed",
  "payment.expired",
  "payment.refunded",
  "payment.partially_refunded",
];

export function WebhooksContent({ merchantId, webhooks }: WebhooksContentProps) {
  return (
    <div className="space-y-8">
      <EndpointsSection merchantId={merchantId} webhooks={webhooks} />
      <Separator />
      <DeliveryLogsSection webhooks={webhooks} />
    </div>
  );
}

/* ─── Endpoints Section ─── */

function EndpointsSection({
  merchantId,
  webhooks,
}: {
  merchantId: string;
  webhooks: WebhookEndpoint[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["payment.confirmed"]);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    delivered: boolean;
    status: number | null;
    body: string | null;
  } | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/internal/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, url, events: selectedEvents }),
      });
      if (res.ok) {
        setUrl("");
        setSelectedEvents(["payment.confirmed"]);
        setDialogOpen(false);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(webhookId: string) {
    const res = await fetch("/api/v1/internal/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, merchantId }),
    });
    if (res.ok) router.refresh();
  }

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/internal/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          id: webhookId,
          delivered: data.delivered,
          status: data.responseStatus,
          body: data.responseBody,
        });
      }
    } finally {
      setTesting(null);
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-zinc-400" />
              Endpoints
            </CardTitle>
            <CardDescription>
              Registered URLs that receive event notifications via HTTP POST.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Webhook Endpoint</DialogTitle>
                <DialogDescription>
                  Payloads are signed with HMAC-SHA256. A signing secret will be
                  auto-generated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/webhooks/goblink"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_OPTIONS.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="rounded border-zinc-600"
                        />
                        {event}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !url || selectedEvents.length === 0}
                >
                  {creating ? "Creating..." : "Add Endpoint"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No webhook endpoints</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add an endpoint to receive real-time payment notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <EndpointRow
                key={wh.id}
                endpoint={wh}
                testing={testing === wh.id}
                testResult={testResult?.id === wh.id ? testResult : null}
                onTest={() => handleTest(wh.id)}
                onDelete={() => handleDelete(wh.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointRow({
  endpoint,
  testing,
  testResult,
  onTest,
  onDelete,
}: {
  endpoint: WebhookEndpoint;
  testing: boolean;
  testResult: { delivered: boolean; status: number | null; body: string | null } | null;
  onTest: () => void;
  onDelete: () => void;
}) {
  const [secretVisible, setSecretVisible] = useState(false);

  return (
    <div className="rounded-lg bg-zinc-800/30 border border-zinc-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm text-white font-mono truncate max-w-[400px] block">
              {endpoint.url}
            </code>
            <Badge variant={endpoint.is_active ? "success" : "secondary"}>
              {endpoint.is_active ? "active" : "inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {endpoint.events.map((event) => (
              <EventBadge key={event} event={event} />
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            Created {formatDate(endpoint.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-blue-400"
            onClick={onTest}
            disabled={testing}
            title="Send test event"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-red-400"
            onClick={onDelete}
            title="Delete endpoint"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Signing secret */}
      <div className="flex items-center gap-2 bg-zinc-900/60 rounded-md px-3 py-2">
        <span className="text-xs text-zinc-500 shrink-0">Signing secret:</span>
        <code className="text-xs text-zinc-300 font-mono flex-1 truncate">
          {secretVisible ? endpoint.secret : "\u2022".repeat(40)}
        </code>
        <button
          onClick={() => setSecretVisible(!secretVisible)}
          className="text-zinc-500 hover:text-zinc-300 shrink-0"
          title={secretVisible ? "Hide" : "Reveal"}
        >
          {secretVisible ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
        <CopyButton value={endpoint.secret} />
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`text-xs px-3 py-2 rounded-md ${
            testResult.delivered
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          Test {testResult.delivered ? "delivered" : "failed"}
          {testResult.status ? ` (${testResult.status})` : ""}
          {testResult.body && (
            <pre className="mt-1 text-xs opacity-75 truncate">
              {testResult.body.slice(0, 200)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Delivery Logs Section ─── */

function DeliveryLogsSection({ webhooks }: { webhooks: WebhookEndpoint[] }) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filterEndpoint, setFilterEndpoint] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filterEndpoint !== "all") params.set("endpoint_id", filterEndpoint);
    if (filterEvent !== "all") params.set("event_type", filterEvent);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/v1/internal/webhooks/deliveries?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEndpoint, filterEvent, filterStatus, debouncedSearch]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterEndpoint, filterEvent, filterStatus, debouncedSearch]);

  async function handleRetry(deliveryId: string) {
    await fetch(`/api/v1/internal/webhooks/deliveries/${deliveryId}/retry`, {
      method: "POST",
    });
    fetchDeliveries();
  }

  const uniqueEvents = Array.from(
    new Set(webhooks.flatMap((w) => w.events))
  ).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-zinc-400" />
          Delivery History
        </CardTitle>
        <CardDescription>
          All webhook delivery attempts across your endpoints.
          {total > 0 && (
            <span className="ml-1 text-zinc-500">
              ({total} total)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by event ID or payment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterEndpoint} onValueChange={setFilterEndpoint}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All endpoints" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All endpoints</SelectItem>
              {webhooks.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {truncateUrl(wh.url)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {uniqueEvents.map((event) => (
                <SelectItem key={event} value={event}>
                  {event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Delivery list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Webhook className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No deliveries found</p>
            <p className="text-xs text-zinc-600 mt-1">
              Webhook deliveries will appear here once events are dispatched.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((delivery) => (
              <DeliveryDetail
                key={delivery.id}
                delivery={delivery}
                onRetry={handleRetry}
                showEndpointUrl={filterEndpoint === "all"}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {/* Page numbers */}
              {generatePageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-xs text-zinc-600">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p as number)}
                    className="h-8 w-8 p-0"
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Helpers ─── */

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 20
      ? parsed.pathname.slice(0, 20) + "..."
      : parsed.pathname;
    return parsed.host + path;
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? "..." : "");
  }
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
