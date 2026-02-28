import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateSessionToken,
  generateOfframpUrl,
  getTransactionStatus,
} from "@/lib/coinbase-offramp";

export const dynamic = "force-dynamic";

// POST /api/v1/internal/offramp/coinbase
// Generate a session token + offramp URL for the authenticated merchant
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, wallet_address, settlement_chain")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  if (!merchant.wallet_address) {
    return NextResponse.json(
      { error: "No wallet address configured. Set one in Settlement Settings." },
      { status: 400 }
    );
  }

  try {
    const sessionToken = await generateSessionToken(merchant.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${appUrl}/api/v1/internal/offramp/coinbase/callback`;

    const offrampUrl = generateOfframpUrl({
      sessionToken,
      merchantId: merchant.id,
      walletAddress: merchant.wallet_address,
      chain: merchant.settlement_chain || "base",
      redirectUrl,
    });

    return NextResponse.json({ url: offrampUrl });
  } catch (err) {
    console.error("Coinbase offramp error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate offramp URL" },
      { status: 500 }
    );
  }
}

// GET /api/v1/internal/offramp/coinbase
// Returns transaction status for the merchant
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  try {
    const status = await getTransactionStatus(merchant.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Coinbase status error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get transaction status" },
      { status: 500 }
    );
  }
}
