import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processMessage } from "@/lib/chatbot/engine";
import { checkRateLimit as checkRL } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
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

  // Rate limit via Supabase RPC (not in-memory — survives serverless cold starts)
  const rl = await checkRL(request, "checkout-default", merchant.id);
  if (!rl.allowed) {
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
