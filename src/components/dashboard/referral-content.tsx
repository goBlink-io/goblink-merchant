"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Check, Gift, UserPlus, Star } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Referral {
  id: string;
  status: "pending" | "active" | "rewarded";
  reward_applied: boolean;
  created_at: string;
  activated_at: string | null;
}

interface ReferralData {
  referralCode: string | null;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    rewardsEarned: number;
  };
  referrals: Referral[];
}

export function ReferralContent() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReferrals = useCallback(async () => {
    const res = await fetch("/api/v1/internal/referrals");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      // Auto-generate referral code if missing
      if (!json.referralCode) {
        setGenerating(true);
        const postRes = await fetch("/api/v1/internal/referrals", { method: "POST" });
        if (postRes.ok) {
          const postJson = await postRes.json();
          setData((prev) => prev ? { ...prev, referralCode: postJson.referralCode } : prev);
        }
        setGenerating(false);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  function copyLink() {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/signup?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    haptic("tap");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function statusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-zinc-600 text-zinc-400">Pending</Badge>;
      case "active":
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">Active</Badge>;
      case "rewarded":
        return <Badge className="bg-green-600/20 text-green-400 border-green-500/30">Rewarded</Badge>;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Referrals</h1>
          <p className="text-zinc-400 text-sm mt-1">Invite merchants and earn rewards</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-zinc-800 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const referralLink = data?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${data.referralCode}`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="text-zinc-400 text-sm mt-1">Invite merchants and earn rewards</p>
      </div>

      {/* Referral link card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with other merchants. When they sign up and make their first payment, you earn a fee waiver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.referralCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 font-mono truncate">
                {referralLink}
              </div>
              <Button
                onClick={copyLink}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <><Check className="h-4 w-4 mr-1" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copy</>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {generating ? "Generating your referral code..." : "Unable to generate referral code."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.stats.totalReferrals ?? 0}</p>
                <p className="text-xs text-zinc-500">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.stats.activeReferrals ?? 0}</p>
                <p className="text-xs text-zinc-500">Active Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-600/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.stats.rewardsEarned ?? 0}</p>
                <p className="text-xs text-zinc-500">Rewards Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reward info */}
      <Card className="bg-gradient-to-r from-blue-600/5 to-violet-600/5 border-zinc-800">
        <CardContent className="p-4 flex items-center gap-3">
          <Gift className="h-5 w-5 text-violet-400 shrink-0" />
          <p className="text-sm text-zinc-300">
            Earn a fee waiver when your referral makes their first payment.
          </p>
        </CardContent>
      </Card>

      {/* Referrals table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.referrals && data.referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-zinc-800/50">
                      <td className="py-3 px-2 text-zinc-300">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        {statusBadge(referral.status)}
                      </td>
                      <td className="py-3 px-2 text-zinc-400">
                        {referral.reward_applied ? (
                          <span className="text-green-400">Applied</span>
                        ) : referral.status === "active" ? (
                          <span className="text-blue-400">Eligible</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No referrals yet</p>
              <p className="text-zinc-600 text-xs mt-1">Share your link to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
