import { getServiceClient } from "@/lib/service-client";
import { deliverWebhook, type WebhookEvent } from "@/lib/webhooks";

interface DeliveryFilters {
  endpointId?: string;
  eventType?: string;
  status?: "success" | "failed";
  search?: string;
  page?: number;
  limit?: number;
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
  webhook_endpoints: {
    id: string;
    url: string;
    events: string[];
  };
}

interface PaginatedDeliveries {
  data: DeliveryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getWebhookDeliveries(
  merchantId: string,
  filters: DeliveryFilters = {}
): Promise<PaginatedDeliveries> {
  const supabase = getServiceClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  // First get this merchant's endpoint IDs
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id")
    .eq("merchant_id", merchantId);

  if (!endpoints || endpoints.length === 0) {
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  const endpointIds = endpoints.map((e) => e.id);

  let query = supabase
    .from("webhook_deliveries")
    .select(
      "id, webhook_endpoint_id, event, payload, response_status, response_body, attempt, delivered_at, created_at, webhook_endpoints!inner(id, url, events)",
      { count: "exact" }
    )
    .in("webhook_endpoint_id", endpointIds)
    .order("created_at", { ascending: false });

  if (filters.endpointId) {
    query = query.eq("webhook_endpoint_id", filters.endpointId);
  }

  if (filters.eventType) {
    query = query.eq("event", filters.eventType);
  }

  if (filters.status === "success") {
    query = query.gte("response_status", 200).lt("response_status", 300);
  } else if (filters.status === "failed") {
    query = query.or("response_status.gte.300,response_status.is.null");
  }

  // Count query before pagination
  const { count } = await query;

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch deliveries: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data as unknown as DeliveryRow[]) ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDeliveryDetail(
  deliveryId: string,
  merchantId: string
): Promise<DeliveryRow | null> {
  const supabase = getServiceClient();

  const { data: delivery } = await supabase
    .from("webhook_deliveries")
    .select(
      "id, webhook_endpoint_id, event, payload, response_status, response_body, attempt, delivered_at, created_at, webhook_endpoints!inner(id, url, events, merchant_id)"
    )
    .eq("id", deliveryId)
    .single();

  if (!delivery) return null;

  // Verify ownership
  const endpoint = delivery.webhook_endpoints as unknown as { merchant_id: string };
  if (endpoint.merchant_id !== merchantId) return null;

  return delivery as unknown as DeliveryRow;
}

export async function retryDelivery(
  deliveryId: string,
  merchantId: string
): Promise<{ success: boolean; status: number | null; body: string | null }> {
  const supabase = getServiceClient();

  // Fetch delivery
  const { data: delivery } = await supabase
    .from("webhook_deliveries")
    .select("id, webhook_endpoint_id, event, payload, attempt")
    .eq("id", deliveryId)
    .single();

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  // Fetch endpoint and verify ownership
  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, merchant_id")
    .eq("id", delivery.webhook_endpoint_id)
    .single();

  if (!endpoint || endpoint.merchant_id !== merchantId) {
    throw new Error("Not authorized");
  }

  return deliverWebhook(
    endpoint.id,
    endpoint.url,
    endpoint.secret,
    delivery.payload as WebhookEvent,
    delivery.attempt + 1
  );
}
