"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/dashboard/copy-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Key, Plus, Trash2, Globe, Webhook, Building2, AlertCircle, Play, RotateCw, ChevronDown, ChevronRight, Loader2, Bell, Palette, Shield } from "lucide-react";
import { MfaSetup } from "@/components/dashboard/mfa-setup";
import { formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/forex";

interface Merchant {
  id: string;
  business_name: string;
  country: string;
  currency: string;
  display_currency: string;
  timezone: string;
  wallet_address: string | null;
  settlement_token: string;
  settlement_chain: string;
  brand_color: string;
  logo_url: string | null;
}

interface ApiKey {
  id: string;
  key_prefix: string;
  label: string;
  is_test: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface NotificationPreferences {
  payment_received: boolean;
  payment_failed: boolean;
  ticket_reply: boolean;
  withdrawal_complete: boolean;
  weekly_summary: boolean;
}

interface SettingsContentProps {
  merchant: Merchant;
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
  notificationPreferences: NotificationPreferences;
}

export function SettingsContent({ merchant, apiKeys, webhooks, notificationPreferences }: SettingsContentProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Business Profile</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="payments">Payment Preferences</TabsTrigger>
        <TabsTrigger value="api">API Keys</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileSettings merchant={merchant} />
      </TabsContent>

      <TabsContent value="branding">
        <BrandingSettings merchant={merchant} />
      </TabsContent>

      <TabsContent value="payments">
        <PaymentSettings merchant={merchant} />
      </TabsContent>

      <TabsContent value="api">
        <ApiKeySettings merchantId={merchant.id} apiKeys={apiKeys} />
      </TabsContent>

      <TabsContent value="webhooks">
        <WebhookSettings merchantId={merchant.id} webhooks={webhooks} />
      </TabsContent>

      <TabsContent value="security">
        <MfaSetup />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationSettings merchantId={merchant.id} preferences={notificationPreferences} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileSettings({ merchant }: { merchant: Merchant }) {
  const [businessName, setBusinessName] = useState(merchant.business_name);
  const [country, setCountry] = useState(merchant.country);
  const [displayCurrency, setDisplayCurrency] = useState(merchant.display_currency || "USD");
  const [timezone, setTimezone] = useState(merchant.timezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({
        business_name: businessName,
        country,
        display_currency: displayCurrency,
        timezone,
      })
      .eq("id", merchant.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-zinc-400" />
          Business Profile
        </CardTitle>
        <CardDescription>Your business information and display settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="JP">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayCurrency">Display Currency</Label>
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                  <SelectItem key={code} value={code}>
                    {info.symbol} {code} — {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Display currency for your dashboard. Settlement is always in crypto.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="America/Toronto">Toronto</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400">Changes saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingSettings({ merchant }: { merchant: Merchant }) {
  const [logoUrl, setLogoUrl] = useState(merchant.logo_url || "");
  const [brandColor, setBrandColor] = useState(merchant.brand_color || "#2563EB");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({
        logo_url: logoUrl || null,
        brand_color: brandColor,
      })
      .eq("id", merchant.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  const initials = merchant.business_name.charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-zinc-400" />
          Checkout Branding
        </CardTitle>
        <CardDescription>
          Customize how your checkout page looks to customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
              />
              <p className="text-xs text-zinc-500">
                Square image recommended (at least 80×80px).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColor">Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="brandColor"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="font-mono flex-1"
                  placeholder="#2563EB"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Used as accent color on your checkout page.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Branding"}
              </Button>
              {saved && (
                <span className="text-sm text-emerald-400">Branding saved!</span>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              {/* Merchant header preview */}
              <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-10 w-10 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: brandColor }}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {merchant.business_name}
                  </p>
                  <p className="text-xs text-zinc-500">is requesting payment</p>
                </div>
              </div>

              {/* Card preview */}
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800/80 p-4 space-y-3">
                <p className="text-xl font-bold text-zinc-50 text-center">$25.00</p>
                <p className="text-xs text-zinc-400 text-center">USD</p>
                <button
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, ${adjustColor(brandColor, 40)})`,
                  }}
                >
                  Pay $25.00
                </button>
              </div>

              {/* Powered by footer */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-zinc-600">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
                </svg>
                Powered by goBlink
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Shift a hex color hue slightly for gradient effect */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function PaymentSettings({ merchant }: { merchant: Merchant }) {
  const [walletAddress, setWalletAddress] = useState(merchant.wallet_address || "");
  const [settlementToken, setSettlementToken] = useState(merchant.settlement_token);
  const [settlementChain, setSettlementChain] = useState(merchant.settlement_chain);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({
        wallet_address: walletAddress || null,
        settlement_token: settlementToken,
        settlement_chain: settlementChain,
      })
      .eq("id", merchant.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-zinc-400" />
          Payment Preferences
        </CardTitle>
        <CardDescription>Configure how you receive payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="walletAddress">Wallet Address</Label>
            <Input
              id="walletAddress"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x... or your exchange deposit address"
              className="font-mono"
            />
            <p className="text-xs text-zinc-500">
              The address where payments will be sent. Use your Base wallet or exchange deposit address.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Settlement Token</Label>
            <Select value={settlementToken} onValueChange={setSettlementToken}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Settlement Chain</Label>
            <Select value={settlementChain} onValueChange={setSettlementChain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="arbitrum">Arbitrum</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400">Changes saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ApiKeySettings({
  merchantId,
  apiKeys,
}: {
  merchantId: string;
  apiKeys: ApiKey[];
}) {
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("Default");
  const [isTest, setIsTest] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  async function handleCreateKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/internal/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, label, isTest }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowNewKey(data.apiKey);
        setDialogOpen(false);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteKey(keyId: string) {
    const res = await fetch("/api/v1/internal/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, merchantId }),
    });

    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* New key alert */}
      {showNewKey && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-400">
                  Your new API key — copy it now. You won&apos;t be able to see it again.
                </p>
                <div className="mt-2 flex items-center gap-2 bg-zinc-900/50 rounded-lg px-3 py-2">
                  <code className="text-sm text-white font-mono break-all flex-1">
                    {showNewKey}
                  </code>
                  <CopyButton value={showNewKey} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowNewKey(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-zinc-400" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for accessing the goBlink Merchant API.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g., WooCommerce, Production"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Test Mode</Label>
                      <p className="text-xs text-zinc-500">
                        Test keys use the gb_test_ prefix and won&apos;t process real payments.
                      </p>
                    </div>
                    <Switch checked={isTest} onCheckedChange={setIsTest} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={creating}>
                    {creating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No API keys yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Create an API key to start integrating with the goBlink API.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/30 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className="h-4 w-4 text-zinc-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-white font-mono">
                          {key.key_prefix}...
                        </code>
                        <Badge
                          variant={key.is_test ? "warning" : "success"}
                        >
                          {key.is_test ? "test" : "live"}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {key.label} — Created {formatDate(key.created_at)}
                        {key.last_used_at && ` — Last used ${formatDate(key.last_used_at)}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-500 hover:text-red-400"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface WebhookDelivery {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
}

function statusColor(status: number | null): string {
  if (status === null) return "text-zinc-500";
  if (status >= 200 && status < 300) return "text-emerald-400";
  return "text-red-400";
}

function statusBadgeVariant(status: number | null): "success" | "destructive" | "secondary" {
  if (status === null) return "secondary";
  if (status >= 200 && status < 300) return "success";
  return "destructive";
}

function DeliveryLogViewer({ webhookId }: { webhookId: string }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function loadDeliveries() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/internal/webhooks/${webhookId}/deliveries`);
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.data ?? []);
      }
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  async function handleRetry(deliveryId: string) {
    setRetrying(deliveryId);
    try {
      await fetch(`/api/v1/internal/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
      });
      // Reload deliveries to show the new attempt
      await loadDeliveries();
    } finally {
      setRetrying(null);
    }
  }

  if (!loaded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-zinc-500"
        onClick={loadDeliveries}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Loading...</>
        ) : (
          "View delivery log"
        )}
      </Button>
    );
  }

  if (deliveries.length === 0) {
    return (
      <p className="text-xs text-zinc-600 py-2">No deliveries yet.</p>
    );
  }

  return (
    <div className="space-y-1 mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-400">Recent Deliveries</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-zinc-500 h-6 px-2"
          onClick={loadDeliveries}
          disabled={loading}
        >
          <RotateCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {deliveries.map((d) => {
        const isExpanded = expandedId === d.id;
        const isFailed = d.response_status === null || d.response_status >= 300;
        return (
          <Collapsible key={d.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? d.id : null)}>
            <div className="rounded border border-zinc-800 bg-zinc-900/50">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />
                  )}
                  <Badge variant="outline" className="text-xs shrink-0">
                    {d.event}
                  </Badge>
                  <Badge variant={statusBadgeVariant(d.response_status)} className="text-xs shrink-0">
                    {d.response_status ?? "pending"}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    attempt {d.attempt}
                  </span>
                  <span className="text-xs text-zinc-600 ml-auto shrink-0">
                    {formatDate(d.created_at)}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-2 border-t border-zinc-800">
                  <div className="mt-2">
                    <p className="text-xs font-medium text-zinc-400 mb-1">Payload</p>
                    <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto max-h-40">
                      {JSON.stringify(d.payload, null, 2)}
                    </pre>
                  </div>
                  {d.response_body && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-1">Response</p>
                      <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto max-h-40">
                        {d.response_body}
                      </pre>
                    </div>
                  )}
                  {isFailed && d.response_status !== null && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleRetry(d.id)}
                      disabled={retrying === d.id}
                    >
                      {retrying === d.id ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Retrying...</>
                      ) : (
                        <><RotateCw className="h-3 w-3" /> Retry</>
                      )}
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

function WebhookSettings({
  merchantId,
  webhooks,
}: {
  merchantId: string;
  webhooks: WebhookEndpoint[];
}) {
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["payment.confirmed"]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; delivered: boolean; status: number | null } | null>(null);
  const router = useRouter();

  const eventOptions = [
    "payment.created",
    "payment.processing",
    "payment.confirmed",
    "payment.failed",
    "payment.expired",
    "payment.refunded",
    "payment.partially_refunded",
  ];

  async function handleCreateWebhook() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/internal/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, url, events: selectedEvents }),
      });

      if (res.ok) {
        setUrl("");
        setDialogOpen(false);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    const res = await fetch("/api/v1/internal/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, merchantId }),
    });

    if (res.ok) {
      router.refresh();
    }
  }

  async function handleTestWebhook(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/internal/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({ id: webhookId, delivered: data.delivered, status: data.responseStatus });
      }
    } finally {
      setTesting(null);
    }
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-zinc-400" />
              Webhook Endpoints
            </CardTitle>
            <CardDescription>
              Receive real-time notifications about payment events.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Endpoint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Webhook Endpoint</DialogTitle>
                <DialogDescription>
                  We&apos;ll send HTTP POST requests to this URL when events occur.
                  All payloads are signed with HMAC-SHA256.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/webhooks/goblink"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {eventOptions.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="rounded border-zinc-600"
                        />
                        {event}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWebhook}
                  disabled={creating || !url || selectedEvents.length === 0}
                >
                  {creating ? "Creating..." : "Add Endpoint"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="text-center py-8">
            <Webhook className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No webhook endpoints</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add an endpoint to receive real-time payment notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="rounded-lg bg-zinc-800/30 border border-zinc-800"
              >
                <div className="flex items-center justify-between py-3 px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-white font-mono truncate">
                        {wh.url}
                      </code>
                      <Badge variant={wh.is_active ? "success" : "secondary"}>
                        {wh.is_active ? "active" : "inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {wh.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    {testResult && testResult.id === wh.id && (
                      <p className={`text-xs mt-1 ${testResult.delivered ? "text-emerald-400" : "text-red-400"}`}>
                        Test {testResult.delivered ? "delivered" : "failed"}{testResult.status ? ` (${testResult.status})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-blue-400"
                      onClick={() => handleTestWebhook(wh.id)}
                      disabled={testing === wh.id}
                      title="Send test event"
                    >
                      {testing === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-red-400"
                      onClick={() => handleDeleteWebhook(wh.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <Separator className="mb-2" />
                  <DeliveryLogViewer webhookId={wh.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const NOTIFICATION_OPTIONS: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "payment_received",
    label: "Payment received",
    description: "Get notified when a payment is confirmed on-chain.",
  },
  {
    key: "payment_failed",
    label: "Payment failed",
    description: "Get notified when a payment fails or expires.",
  },
  {
    key: "ticket_reply",
    label: "Ticket replies",
    description: "Get notified when an admin replies to your support ticket.",
  },
  {
    key: "withdrawal_complete",
    label: "Withdrawal complete",
    description: "Get notified when a withdrawal finishes processing.",
  },
  {
    key: "weekly_summary",
    label: "Weekly summary",
    description: "Receive a weekly email summarizing your revenue and activity.",
  },
];

function NotificationSettings({
  merchantId,
  preferences,
}: {
  merchantId: string;
  preferences: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function togglePref(key: keyof NotificationPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({ notification_preferences: prefs })
      .eq("id", merchantId);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-zinc-400" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which email notifications you&apos;d like to receive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {NOTIFICATION_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/30 border border-zinc-800"
            >
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
              </div>
              <Switch
                checked={prefs[opt.key]}
                onCheckedChange={() => togglePref(opt.key)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400">Preferences saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
