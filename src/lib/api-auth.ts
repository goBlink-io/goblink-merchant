import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Use service role for API key validation (bypasses RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ApiKeyValidation {
  merchantId: string;
  isTest: boolean;
  keyId: string;
}

export async function validateApiKey(
  authHeader: string | null
): Promise<ApiKeyValidation | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer "

  if (!apiKey.startsWith("gb_live_") && !apiKey.startsWith("gb_test_")) {
    return null;
  }

  const supabase = getServiceClient();

  // Get all active API keys and check against bcrypt hashes
  // We use the prefix to narrow down candidates
  const prefix = apiKey.slice(0, apiKey.indexOf("_", 3) + 1 + 8); // e.g., "gb_live_" + first 8 chars
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, merchant_id, key_hash, is_test")
    .like("key_prefix", `${prefix.slice(0, 12)}%`);

  if (error || !keys || keys.length === 0) {
    return null;
  }

  for (const key of keys) {
    const matches = await bcrypt.compare(apiKey, key.key_hash);
    if (matches) {
      // Update last_used_at
      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id);

      return {
        merchantId: key.merchant_id,
        isTest: key.is_test,
        keyId: key.id,
      };
    }
  }

  return null;
}

export async function generateApiKey(
  merchantId: string,
  isTest: boolean,
  label: string = "Default"
): Promise<{ apiKey: string; keyId: string }> {
  const supabase = getServiceClient();

  // Generate a random API key
  const prefix = isTest ? "gb_test_" : "gb_live_";
  const randomPart = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const apiKey = `${prefix}${randomPart}`;

  // Hash the key
  const keyHash = await bcrypt.hash(apiKey, 10);

  // Store the first portion for display (prefix + 8 chars)
  const keyPrefix = apiKey.slice(0, prefix.length + 8);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      merchant_id: merchantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label,
      is_test: isTest,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return { apiKey, keyId: data.id };
}
