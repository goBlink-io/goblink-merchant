import type { SupabaseClient } from "@supabase/supabase-js";

export interface MilestoneDefinition {
  key: string;
  label: string;
  emoji: string;
  check: (stats: MilestoneStats) => boolean;
}

export interface MilestoneStats {
  totalPayments: number;
  todayRevenue: number;
  totalRevenue: number;
  merchantCreatedAt: string;
}

export const MILESTONES: MilestoneDefinition[] = [
  {
    key: "first_payment",
    label: "First Payment",
    emoji: "\u{1F389}",
    check: (s) => s.totalPayments >= 1,
  },
  {
    key: "ten_payments",
    label: "10 Payments",
    emoji: "\u{1F4E6}",
    check: (s) => s.totalPayments >= 10,
  },
  {
    key: "hundred_payments",
    label: "100 Payments",
    emoji: "\u{1F680}",
    check: (s) => s.totalPayments >= 100,
  },
  {
    key: "first_100_day",
    label: "$100 Day",
    emoji: "\u{1F4B0}",
    check: (s) => s.todayRevenue >= 100,
  },
  {
    key: "first_1k_day",
    label: "$1K Day",
    emoji: "\u{1F525}",
    check: (s) => s.todayRevenue >= 1000,
  },
  {
    key: "ten_k_revenue",
    label: "$10K Revenue",
    emoji: "\u{1F48E}",
    check: (s) => s.totalRevenue >= 10000,
  },
  {
    key: "thirty_days_active",
    label: "30 Days Active",
    emoji: "\u{1F3C6}",
    check: (s) => {
      const age = Date.now() - new Date(s.merchantCreatedAt).getTime();
      return age >= 30 * 24 * 60 * 60 * 1000;
    },
  },
];

const MILESTONE_LABELS: Record<string, { emoji: string; title: string; body: string }> = {};
for (const m of MILESTONES) {
  MILESTONE_LABELS[m.key] = {
    emoji: m.emoji,
    title: `${m.emoji} Milestone unlocked: ${m.label}`,
    body: `You've achieved the "${m.label}" milestone. Keep it up!`,
  };
}

/**
 * Check conditions and award any new milestones for a merchant.
 * Returns array of newly awarded milestone keys.
 */
export async function checkAndAwardMilestones(
  supabase: SupabaseClient,
  merchantId: string,
  stats: MilestoneStats
): Promise<string[]> {
  const awarded: string[] = [];

  for (const milestone of MILESTONES) {
    if (!milestone.check(stats)) continue;

    const { data, error } = await supabase
      .from("merchant_milestones")
      .insert({
        merchant_id: merchantId,
        milestone_key: milestone.key,
      })
      .select("id")
      .single();

    // ON CONFLICT (unique constraint) → error code 23505
    if (error) {
      if (error.code === "23505") continue; // already awarded
      console.error(`[milestones] Failed to award ${milestone.key}:`, error.message);
      continue;
    }

    if (data) {
      awarded.push(milestone.key);
    }
  }

  return awarded;
}

export { MILESTONE_LABELS };
