// NOTE: Supabase Realtime must be enabled on the 'payments' table.
// In Supabase Dashboard: Database → Replication → enable the 'payments' table for realtime.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RealtimePaymentRecord = Record<string, any>;

interface UseRealtimePaymentsOptions {
  onInsert?: (record: RealtimePaymentRecord) => void;
  onUpdate?: (record: RealtimePaymentRecord) => void;
}

export function useRealtimePayments(
  merchantId: string | undefined,
  options?: UseRealtimePaymentsOptions
) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const onInsertRef = useRef(options?.onInsert);
  const onUpdateRef = useRef(options?.onUpdate);

  useEffect(() => {
    onInsertRef.current = options?.onInsert;
    onUpdateRef.current = options?.onUpdate;
  }, [options?.onInsert, options?.onUpdate]);

  useEffect(() => {
    if (!merchantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`payments-rt-${merchantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          onInsertRef.current?.(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `merchant_id=eq.${merchantId}`,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("reconnecting");
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId]);

  return { connectionStatus };
}
