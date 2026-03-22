"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Send,
  RotateCcw,
  Loader2,
  Copy,
  Check,
  Eye,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: Array<{ name: string; description: string }>;
  is_active: boolean;
  updated_at: string;
}

// Sample variables for preview rendering
const sampleVariables: Record<string, Record<string, string>> = {
  verification: {
    business_name: "Acme Payments Inc.",
    verification_url: "#",
  },
  password_reset: {
    business_name: "Acme Payments Inc.",
    reset_url: "#",
  },
  welcome: {
    business_name: "Acme Payments Inc.",
    dashboard_url: "#",
  },
  payment_received: {
    business_name: "Acme Payments Inc.",
    amount: "150.00",
    currency: "USD",
    crypto_amount: "150.00",
    crypto_token: "USDC",
    crypto_chain: "Base",
    customer_wallet: "0x1234...abcd",
    order_id: "ORD-2026-001",
    tx_hash: "0xabcdef...567890",
    payment_url: "#",
    dashboard_url: "#",
  },
  payment_failed: {
    business_name: "Acme Payments Inc.",
    amount: "75.00",
    currency: "USD",
    order_id: "ORD-2026-002",
    reason: "Payment expired — customer did not complete payment in time",
    payment_url: "#",
    dashboard_url: "#",
  },
  ticket_reply: {
    business_name: "Acme Payments Inc.",
    ticket_subject: "Issue with payment integration",
    message_preview:
      "Hi, we've looked into your issue and found the webhook URL was misconfigured.",
    ticket_status: "in_progress",
    ticket_url: "#",
    dashboard_url: "#",
  },
  withdrawal_complete: {
    business_name: "Acme Payments Inc.",
    amount: "500.00",
    currency: "USD",
    destination_address: "0x9876...fedc",
    destination_chain: "Base",
    destination_token: "USDC",
    tx_hash: "0xfedcba...654321",
    wallet_url: "#",
    dashboard_url: "#",
  },
  weekly_summary: {
    business_name: "Acme Payments Inc.",
    total_revenue: "2,450.00",
    payment_count: "34",
    top_token: "USDC",
    top_chain: "Base",
    trend_percent: "12",
    trend_direction: "\u2191",
    trend_color: "#4ade80",
    open_tickets: "2",
    dashboard_url: "#",
  },
};

function renderPreview(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  result = result.replace(/\{\{[a-zA-Z_]+\}\}/g, "");
  return result;
}

export default function AdminTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [darkPreview, setDarkPreview] = useState(true);

  // Draft state for editing
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`/api/admin/templates/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.template) {
          setTemplate(data.template);
          setSubject(data.template.subject);
          setBodyHtml(data.template.body_html);
          setBodyText(data.template.body_text);
          setIsActive(data.template.is_active);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Track changes
  useEffect(() => {
    if (!template) return;
    const changed =
      subject !== template.subject ||
      bodyHtml !== template.body_html ||
      bodyText !== template.body_text ||
      isActive !== template.is_active;
    setHasChanges(changed);
  }, [subject, bodyHtml, bodyText, isActive, template]);

  // Build preview HTML as srcdoc (sandboxed, no script execution)
  const previewSrcdoc = useMemo(() => {
    if (!template) return "";
    const vars = sampleVariables[template.type] || {};
    const rendered = renderPreview(bodyHtml, vars);
    const bgColor = darkPreview ? "#09090b" : "#ffffff";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:${bgColor}}</style></head><body>${rendered}</body></html>`;
  }, [bodyHtml, template, darkPreview]);

  // (preview is now rendered via srcdoc, no imperative update needed)

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body_html: bodyHtml, body_text: bodyText, is_active: isActive }),
      });
      const data = await res.json();
      if (data.template) {
        setTemplate(data.template);
        setHasChanges(false);
        showToast("Template saved successfully");
      } else {
        showToast("Failed to save template");
      }
    } catch {
      showToast("Failed to save template");
    }
    setSaving(false);
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      // Save first if there are changes
      if (hasChanges) {
        await fetch(`/api/admin/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body_html: bodyHtml, body_text: bodyText, is_active: isActive }),
        });
      }

      const res = await fetch(`/api/admin/templates/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Test email sent to ${data.sentTo}`);
      } else {
        showToast("Failed to send test email");
      }
    } catch {
      showToast("Failed to send test email");
    }
    setSendingTest(false);
  }

  async function handleReset() {
    if (!confirm("Reset this template to its default content? This cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/templates/${id}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.template) {
        setTemplate(data.template);
        setSubject(data.template.subject);
        setBodyHtml(data.template.body_html);
        setBodyText(data.template.body_text);
        setIsActive(data.template.is_active);
        setHasChanges(false);
        showToast("Template reset to default");
      } else {
        showToast("Failed to reset template");
      }
    } catch {
      showToast("Failed to reset template");
    }
    setResetting(false);
  }

  function handleCopyVariable(name: string) {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(null), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Template not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/admin/templates")}>
          Back to templates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400"
            onClick={() => router.push("/admin/templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{template.name}</h1>
            <code className="text-xs text-zinc-500">{template.type}</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-zinc-400 border-zinc-700"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Reset to Default
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-zinc-400 border-zinc-700"
            onClick={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send Test
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {toast && (
        <div className="bg-blue-600/10 border border-blue-600/30 text-blue-400 px-4 py-3 rounded-lg text-sm">
          {toast}
        </div>
      )}

      {/* Main editor layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* Active toggle */}
          <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm text-zinc-300">
              {isActive ? "Active" : "Inactive"} — {isActive ? "This template will be sent" : "This template is disabled"}
            </Label>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="font-mono text-sm"
              placeholder="Email subject line..."
            />
          </div>

          {/* Body HTML */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Body HTML</Label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="w-full h-[400px] bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-200 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="HTML email content..."
              spellCheck={false}
            />
          </div>

          {/* Body Text */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Body Text (plain text fallback)</Label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full h-[150px] bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-200 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Plain text fallback..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right: Preview + Variables */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </Label>
              <button
                onClick={() => setDarkPreview(!darkPreview)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded bg-zinc-800"
              >
                {darkPreview ? "Light bg" : "Dark bg"}
              </button>
            </div>
            <div
              className="border border-zinc-800 rounded-lg overflow-hidden"
              style={{ backgroundColor: darkPreview ? "#09090b" : "#ffffff" }}
            >
              <iframe
                ref={iframeRef}
                title="Email Preview"
                className="w-full border-0"
                style={{ height: "600px" }}
                sandbox=""
                srcDoc={previewSrcdoc}
              />
            </div>
          </div>

          {/* Available Variables */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Available Variables</Label>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-2">
                {template.variables.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => handleCopyVariable(v.name)}
                    className="flex items-center justify-between text-left p-2 rounded-md hover:bg-zinc-800 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-blue-400">
                        {"{{"}
                        {v.name}
                        {"}}"}
                      </code>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{v.description}</p>
                    </div>
                    <span className="ml-2 shrink-0">
                      {copiedVar === v.name ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-full px-6 py-3 shadow-lg">
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30">
              Unsaved changes
            </Badge>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
