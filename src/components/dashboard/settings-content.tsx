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
import { Key, Plus, Trash2, Globe, Webhook, Building2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Merchant {
  id: string;
  business_name: string;
  country: string;
  currency: string;
  timezone: string;
  wallet_address: string | null;
  settlement_token: string;
  settlement_chain: string;
  brand_color: string;
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

interface SettingsContentProps {
  merchant: Merchant;
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
}

export function SettingsContent({ merchant, apiKeys, webhooks }: SettingsContentProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Business Profile</TabsTrigger>
        <TabsTrigger value="payments">Payment Preferences</TabsTrigger>
        <TabsTrigger value="api">API Keys</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileSettings merchant={merchant} />
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
    </Tabs>
  );
}

function ProfileSettings({ merchant }: { merchant: Merchant }) {
  const [businessName, setBusinessName] = useState(merchant.business_name);
  const [country, setCountry] = useState(merchant.country);
  const [currency, setCurrency] = useState(merchant.currency);
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
        currency,
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
            <Label htmlFor="currency">Store Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
                <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                <SelectItem value="JPY">JPY — Japanese Yen</SelectItem>
              </SelectContent>
            </Select>
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
  const router = useRouter();

  const eventOptions = [
    "payment.created",
    "payment.processing",
    "payment.confirmed",
    "payment.failed",
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
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-zinc-800/30 border border-zinc-800"
              >
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
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-500 hover:text-red-400 shrink-0 ml-2"
                  onClick={() => handleDeleteWebhook(wh.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
