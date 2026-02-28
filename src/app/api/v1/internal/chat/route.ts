import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processMessage } from "@/lib/chatbot/engine";

// Simple in-request rate limit tracking via headers
// For production, use a proper store — but this is an internal endpoint behind auth
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(merchantId: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const maxRequests = 30;

  const entry = rateLimitMap.get(merchantId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(merchantId, { count: 1, resetAt: now + window });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth: require logged-in merchant
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json(
      { error: { message: "Merchant not found" } },
      { status: 404 }
    );
  }

  // Rate limit
  if (!checkRateLimit(merchant.id)) {
    return NextResponse.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // Parse body
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message || message.length > 500) {
    return NextResponse.json(
      {
        error: {
          message: message
            ? "Message too long (max 500 characters)"
            : "Message is required",
        },
      },
      { status: 400 }
    );
  }

  // Process through chat engine
  const response = await processMessage(message, merchant.id, supabase);

  return NextResponse.json(response);
}
