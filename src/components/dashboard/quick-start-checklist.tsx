"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Wallet,
  Settings,
  Link2,
  TestTube,
  Webhook,
  X,
  PartyPopper,
} from "lucide-react";
import Link from "next/link";

interface OnboardingChecklist {
  account_created: boolean;
  wallet_connected: boolean;
  settlement_configured: boolean;
  first_link_created: boolean;
  test_payment_completed: boolean;
  webhook_configured: boolean;
}

interface QuickStartChecklistProps {
  merchantId: string;
  checklist: OnboardingChecklist;
  firstPaymentCelebrated: boolean;
}

const CHECKLIST_ITEMS: {
  key: keyof OnboardingChecklist;
  label: string;
  href: string;
  icon: React.ElementType;
  optional?: boolean;
}[] = [
  {
    key: "account_created",
    label: "Account created",
    href: "/dashboard/settings",
    icon: CheckCircle2,
  },
  {
    key: "wallet_connected",
    label: "Wallet connected",
    href: "/dashboard/settings?tab=payments",
    icon: Wallet,
  },
  {
    key: "settlement_configured",
    label: "Settlement configured",
    href: "/dashboard/settings?tab=payments",
    icon: Settings,
  },
  {
    key: "first_link_created",
    label: "First payment link created",
    href: "/dashboard/payment-links",
    icon: Link2,
  },
  {
    key: "test_payment_completed",
    label: "Test payment completed",
    href: "/dashboard/payments",
    icon: TestTube,
  },
  {
    key: "webhook_configured",
    label: "Webhook configured",
    href: "/dashboard/settings?tab=webhooks",
    icon: Webhook,
    optional: true,
  },
];

export function QuickStartChecklist({
  merchantId,
  checklist,
  firstPaymentCelebrated,
}: QuickStartChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState(checklist);
  const router = useRouter();
  const supabase = createClient();

  const completedCount = Object.values(currentChecklist).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Required items (all except webhook)
  const requiredDone = CHECKLIST_ITEMS.filter((item) => !item.optional).every(
    (item) => currentChecklist[item.key]
  );

  // All done including optional
  const allDone = completedCount === totalCount;

  // Show celebration when all required items are done and we haven't celebrated yet
  const shouldCelebrate = requiredDone && !firstPaymentCelebrated && !showCelebration;

  if (dismissed) return null;
  if (allDone && firstPaymentCelebrated) return null;

  // Trigger celebration on first render if conditions met
  if (shouldCelebrate && !showCelebration) {
    // Will be handled by the celebration display below
  }

  async function handleDismiss() {
    setDismissed(true);
    // Persist dismissal by marking celebration as done
    await supabase
      .from("merchants")
      .update({ first_payment_celebrated: true })
      .eq("id", merchantId);
    router.refresh();
  }

  async function handleSkipWebhook() {
    const updated = { ...currentChecklist, webhook_configured: true };
    setCurrentChecklist(updated);
    await supabase
      .from("merchants")
      .update({ onboarding_checklist: updated })
      .eq("id", merchantId);
    router.refresh();
  }

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-violet-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {requiredDone ? (
              <PartyPopper className="h-5 w-5 text-yellow-400" />
            ) : null}
            {requiredDone ? "You're all set!" : "Quick Start"}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {completedCount}/{totalCount} complete
            </span>
            <span className="text-zinc-500">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {requiredDone && (
          <p className="text-sm text-zinc-400 mb-3">
            Your merchant account is ready to accept payments!
          </p>
        )}

        {CHECKLIST_ITEMS.map((item) => {
          const checked = currentChecklist[item.key];
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {checked ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-600 shrink-0" />
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      checked ? "text-zinc-500 line-through" : "text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.optional && !checked && (
                    <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.optional && !checked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-500 h-7 px-2"
                    onClick={handleSkipWebhook}
                  >
                    Skip
                  </Button>
                )}
                {!checked && (
                  <Link href={item.href}>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-400 h-7 px-2">
                      Set up
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
