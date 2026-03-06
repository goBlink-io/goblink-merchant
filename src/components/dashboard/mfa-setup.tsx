"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

type MfaStatus = "loading" | "disabled" | "enabled";
type SetupStep = "idle" | "enrolling" | "verify" | "success";

export function MfaSetup() {
  const supabase = createClient();
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>("loading");
  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  async function checkMfaStatus() {
    setMfaStatus("loading");
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMfaStatus("disabled");
      return;
    }
    const verifiedTotp = data.totp.find((f) => f.status === "verified");
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMfaStatus("enabled");
    } else {
      setMfaStatus("disabled");
    }
  }

  async function handleEnroll() {
    setError(null);
    setSetupStep("enrolling");
    setLoading(true);

    // Unenroll any unverified factors first
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors) {
      for (const f of factors.totp) {
        if ((f.status as string) !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      setSetupStep("idle");
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setSetupStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: verifyCode,
    });

    setLoading(false);

    if (verify.error) {
      setError("Invalid code. Please try again.");
      return;
    }

    setSetupStep("success");
    setMfaStatus("enabled");
    setVerifyCode("");
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Verify current code before disabling
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: disableCode,
    });

    if (verify.error) {
      setError("Invalid code. Please enter a valid TOTP code.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMfaStatus("disabled");
    setShowDisable(false);
    setDisableCode("");
    setFactorId("");
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (mfaStatus === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-zinc-400" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with TOTP-based 2FA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
          <div className="flex items-center gap-3">
            {mfaStatus === "enabled" ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-zinc-500" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                Two-factor authentication
              </p>
              <p className="text-xs text-zinc-500">
                {mfaStatus === "enabled"
                  ? "Your account is protected with 2FA."
                  : "Add 2FA to protect your account."}
              </p>
            </div>
          </div>
          <Badge variant={mfaStatus === "enabled" ? "success" : "secondary"}>
            {mfaStatus === "enabled" ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        {/* Enable Flow */}
        {mfaStatus === "disabled" && setupStep === "idle" && (
          <Button onClick={handleEnroll}>Enable 2FA</Button>
        )}

        {/* QR Code + Verify Step */}
        {setupStep === "verify" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-300">
                  1. Scan this QR code with your authenticator app
                </Label>
                <div className="mt-3 flex justify-center">
                  <div className="rounded-xl bg-white p-4">
                    <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">
                  Or enter this secret key manually
                </Label>
                <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700">
                  <code className="text-sm text-white font-mono break-all flex-1">
                    {secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={handleCopySecret}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-zinc-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code">
                  2. Enter the 6-digit code from your app
                </Label>
                <Input
                  id="verify-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-lg tracking-widest max-w-xs"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading || verifyCode.length !== 6}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSetupStep("idle");
                    setError(null);
                    setVerifyCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Success Message */}
        {setupStep === "success" && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">
                Two-factor authentication enabled successfully!
              </p>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              You&apos;ll be asked for a code from your authenticator app when signing in.
            </p>
          </div>
        )}

        {/* Disable Flow */}
        {mfaStatus === "enabled" && setupStep !== "verify" && (
          <div>
            {!showDisable ? (
              <Button
                variant="outline"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                onClick={() => setShowDisable(true)}
              >
                Disable 2FA
              </Button>
            ) : (
              <form onSubmit={handleDisable} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="disable-code">
                    Enter your current 2FA code to disable
                  </Label>
                  <Input
                    id="disable-code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-lg tracking-widest max-w-xs"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={loading || disableCode.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      "Confirm Disable"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDisable(false);
                      setError(null);
                      setDisableCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
