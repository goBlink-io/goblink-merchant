import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-auth";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

// POST — Create API key (authenticated via session)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { merchantId, label, isTest } = body as {
    merchantId: string;
    label?: string;
    isTest?: boolean;
  };

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const { apiKey, keyId } = await generateApiKey(
    merchantId,
    isTest ?? false,
    label || "Default"
  );

  logAudit({
    merchantId,
    actor: user.id,
    action: "api_key.created",
    resourceType: "api_key",
    resourceId: keyId,
    metadata: { label: label || "Default", isTest: isTest ?? false },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess({ apiKey, keyId }, 201);
}

// DELETE — Delete API key (authenticated via session)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { keyId, merchantId } = body as { keyId: string; merchantId: string };

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("merchant_id", merchantId);

  if (error) {
    return apiError("Failed to delete API key", 500);
  }

  logAudit({
    merchantId,
    actor: user.id,
    action: "api_key.deleted",
    resourceType: "api_key",
    resourceId: keyId,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess({ deleted: true });
}

// IPv4 or IPv6 validation
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_RE = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function isValidIp(ip: string): boolean {
  return IPV4_RE.test(ip) || IPV6_RE.test(ip);
}

// PATCH — Update allowed IPs for an API key (authenticated via session)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { keyId, merchantId, allowedIps } = body as {
    keyId: string;
    merchantId: string;
    allowedIps: string[];
  };

  if (!keyId || !merchantId) {
    return apiError("keyId and merchantId are required", 400);
  }

  if (!Array.isArray(allowedIps)) {
    return apiError("allowedIps must be an array", 400);
  }

  // Validate each IP
  for (const ip of allowedIps) {
    if (typeof ip !== "string" || !isValidIp(ip.trim())) {
      return apiError(`Invalid IP address: ${ip}`, 400);
    }
  }

  // Verify merchant belongs to this user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return apiError("Merchant not found", 404);
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("api_keys")
    .update({ allowed_ips: allowedIps.map((ip) => ip.trim()) })
    .eq("id", keyId)
    .eq("merchant_id", merchantId);

  if (error) {
    return apiError("Failed to update allowed IPs", 500);
  }

  logAudit({
    merchantId,
    actor: user.id,
    action: "api_key.ip_allowlist_updated",
    resourceType: "api_key",
    resourceId: keyId,
    metadata: { allowedIps },
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return apiSuccess({ updated: true, allowedIps });
}
