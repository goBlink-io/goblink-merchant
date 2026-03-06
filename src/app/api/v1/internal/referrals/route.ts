import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function generateReferralCode(): string {
  const random = crypto.randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
  return `ref_${random}`;
}

// GET /api/v1/internal/referrals — fetch merchant referrals + stats
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
    .select("id, referral_code")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const { data: referrals } = await supabase
    .from("merchant_referrals")
    .select("id, status, reward_applied, created_at, activated_at")
    .eq("referrer_id", merchant.id)
    .order("created_at", { ascending: false });

  const list = referrals ?? [];
  const totalReferrals = list.length;
  const activeReferrals = list.filter((r) => r.status === "active" || r.status === "rewarded").length;
  const rewardsEarned = list.filter((r) => r.status === "rewarded").length;

  return NextResponse.json({
    referralCode: merchant.referral_code,
    stats: { totalReferrals, activeReferrals, rewardsEarned },
    referrals: list,
  });
}

// POST /api/v1/internal/referrals — generate referral code if not exists
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, referral_code")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  if (merchant.referral_code) {
    return NextResponse.json({ referralCode: merchant.referral_code });
  }

  // Generate a unique referral code with retry
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const { error } = await supabase
      .from("merchants")
      .update({ referral_code: code })
      .eq("id", merchant.id);

    if (!error) {
      return NextResponse.json({ referralCode: code });
    }

    // Unique constraint violation — retry with new code
    code = generateReferralCode();
    attempts++;
  }

  return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 });
}
