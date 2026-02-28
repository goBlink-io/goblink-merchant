"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { EventBadge } from "./event-badge";
import { formatDate } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, RotateCw, Loader2 } from "lucide-react";

interface DeliveryData {
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

interface DeliveryDetailProps {
  delivery: DeliveryData;
  onRetry?: (deliveryId: string) => Promise<void>;
  showEndpointUrl?: boolean;
}

export function DeliveryDetail({ delivery, onRetry, showEndpointUrl = true }: DeliveryDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isFailed = delivery.response_status === null || delivery.response_status >= 300;

  async function handleRetry() {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry(delivery.id);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            )}
            <EventBadge event={delivery.event} />
            {showEndpointUrl && delivery.webhook_endpoints && (
              <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
                {delivery.webhook_endpoints.url}
              </span>
            )}
            <StatusBadge
              status={delivery.response_status}
              responseBody={delivery.response_body}
            />
            <span className="text-xs text-zinc-500">
              #{delivery.attempt}
            </span>
            <span className="text-xs text-zinc-600 ml-auto shrink-0">
              {formatDate(delivery.created_at)}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
            {/* Request headers */}
            <div className="mt-3">
              <p className="text-xs font-medium text-zinc-400 mb-1">Request Headers</p>
              <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2.5 overflow-x-auto max-h-32">
{`Content-Type: application/json
X-GoBlink-Event: ${delivery.event}
X-GoBlink-Signature: <hmac-sha256>
X-GoBlink-Timestamp: <unix-ts>
User-Agent: goBlink-Webhook/1.0`}
              </pre>
            </div>

            {/* Request payload */}
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-1">Request Payload</p>
              <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2.5 overflow-x-auto max-h-48">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>

            {/* Response */}
            {delivery.response_body && (
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">
                  Response Body{" "}
                  <span className="text-zinc-600">(first 500 chars)</span>
                </p>
                <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2.5 overflow-x-auto max-h-32">
                  {delivery.response_body.slice(0, 500)}
                </pre>
              </div>
            )}

            {/* Retry button */}
            {isFailed && onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCw className="h-3 w-3" />
                    Retry
                  </>
                )}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
