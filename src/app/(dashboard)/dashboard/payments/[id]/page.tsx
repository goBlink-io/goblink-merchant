import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate, getStatusColor, truncateAddress } from "@/lib/utils";
import { getExplorerTxUrl } from "@/lib/explorer";
import { getExchangeRate } from "@/lib/forex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PaymentShareSection } from "@/components/dashboard/payment-share-section";
import { PaymentRefundSection } from "@/components/dashboard/payment-refund-section";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  ExternalLink,
  ArrowDownToLine,
} from "lucide-react";
import Link from "next/link";
import { SettlementQR } from "@/components/dashboard/settlement-qr";

const statusTimeline = [
  { key: "pending", label: "Created", icon: Clock },
  { key: "processing", label: "Processing", icon: Loader2 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
];

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, display_currency")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/login");

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .single();

  if (!payment) notFound();

  const dc = merchant.display_currency || "USD";
  const rate = (await getExchangeRate(dc)) ?? 1;
  const showDc = dc !== "USD";

  function fmtDc(amountUsd: number): string {
    if (!showDc) return formatCurrency(amountUsd, "USD");
    return formatCurrency(amountUsd * rate, dc);
  }

  function fmtUsdSub(amountUsd: number): string | null {
    if (!showDc) return null;
    return formatCurrency(amountUsd, "USD");
  }

  // Fetch refunds for this payment
  const { data: refunds } = await supabase
    .from("refunds")
    .select("*")
    .eq("payment_id", payment.id)
    .order("created_at", { ascending: false });

  const statusIndex = (() => {
    switch (payment.status) {
      case "pending":
        return 0;
      case "processing":
        return 1;
      case "confirmed":
        return 2;
      case "failed":
      case "expired":
        return -1;
      case "refunded":
      case "partially_refunded":
        return 3;
      default:
        return 0;
    }
  })();

  return (
    <div className="space-y-6">
      {/* Test payment banner */}
      {payment.is_test && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
          <p className="text-sm font-medium text-amber-400">
            TEST PAYMENT — This payment was created with a test API key
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {payment.external_order_id || `Payment #${payment.id.slice(0, 8)}`}
            </h1>
            {payment.is_test && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30" variant="outline">
                Test
              </Badge>
            )}
            <Badge className={getStatusColor(payment.status)} variant="outline">
              {payment.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Created {formatDate(payment.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-zinc-400" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Amount</p>
                  <p className="text-sm text-white">{fmtDc(Number(payment.amount))}</p>
                  {fmtUsdSub(Number(payment.amount)) && (
                    <p className="text-xs text-zinc-500">{fmtUsdSub(Number(payment.amount))}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Net Amount</p>
                  <p className="text-sm text-white">
                    {payment.net_amount ? fmtDc(Number(payment.net_amount)) : "--"}
                  </p>
                  {payment.net_amount && fmtUsdSub(Number(payment.net_amount)) && (
                    <p className="text-xs text-zinc-500">{fmtUsdSub(Number(payment.net_amount))}</p>
                  )}
                </div>
                <DetailItem
                  label="Fee"
                  value={
                    payment.fee_amount
                      ? `${payment.fee_amount} ${payment.fee_currency || payment.currency}`
                      : "--"
                  }
                />
                <DetailItem label="Currency" value={showDc ? `${dc} (internal: ${payment.currency})` : payment.currency} />
              </div>

              {payment.crypto_amount && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem
                      label="Crypto Amount"
                      value={`${payment.crypto_amount} ${payment.crypto_token || ""}`}
                    />
                    <DetailItem
                      label="Chain"
                      value={payment.crypto_chain || "--"}
                    />
                  </div>
                </>
              )}

              {(payment.send_tx_hash || payment.fulfillment_tx_hash) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {payment.send_tx_hash && (
                      <TxHashItem
                        label="Send TX Hash"
                        txHash={payment.send_tx_hash}
                        chain={payment.customer_chain}
                      />
                    )}
                    {payment.fulfillment_tx_hash && (
                      <TxHashItem
                        label="Fulfillment TX Hash"
                        txHash={payment.fulfillment_tx_hash}
                        chain={payment.crypto_chain}
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          {(payment.customer_wallet || payment.customer_chain) && (
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {payment.customer_wallet && (
                    <DetailItem
                      label="Wallet"
                      value={truncateAddress(payment.customer_wallet, 10)}
                      copyValue={payment.customer_wallet}
                      isHash
                    />
                  )}
                  <DetailItem
                    label="Source Chain"
                    value={payment.customer_chain || "--"}
                  />
                  <DetailItem
                    label="Source Token"
                    value={payment.customer_token || "--"}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Action + History */}
          <PaymentRefundSection
            paymentId={payment.id}
            paymentStatus={payment.status}
            paymentAmount={Number(payment.amount)}
            currency={payment.currency}
            initialRefunds={refunds ?? []}
            isTest={!!payment.is_test}
          />

          {/* Metadata */}
          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-4 overflow-x-auto font-mono">
                  {JSON.stringify(payment.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share section for shareable payments */}
          {(payment.status === "pending" || payment.status === "processing") &&
            payment.payment_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentShareSection
                    payment={{
                      id: payment.id,
                      amount: Number(payment.amount),
                      currency: payment.currency,
                      status: payment.status,
                      payment_url: payment.payment_url,
                      external_order_id: payment.external_order_id,
                    }}
                  />
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payment.status === "failed" || payment.status === "expired" ? (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400 capitalize">
                        {payment.status}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(payment.updated_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  statusTimeline.map((step, i) => {
                    const isComplete = i <= statusIndex;
                    const isCurrent = i === statusIndex;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isComplete
                              ? "bg-blue-500/10"
                              : "bg-zinc-800"
                          }`}
                        >
                          <step.icon
                            className={`h-4 w-4 ${
                              isComplete ? "text-blue-400" : "text-zinc-600"
                            } ${isCurrent && step.key === "processing" ? "animate-spin" : ""}`}
                          />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              isComplete ? "text-white" : "text-zinc-600"
                            }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-zinc-500">
                              {step.key === "confirmed" && payment.confirmed_at
                                ? formatDate(payment.confirmed_at)
                                : formatDate(payment.updated_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {(payment.status === "refunded" ||
                  payment.status === "partially_refunded") && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-400 capitalize">
                        {payment.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settlement Status */}
          {payment.settlement_status && payment.settlement_status !== "none" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-zinc-400" />
                  Settlement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Status</p>
                  <Badge
                    className={
                      payment.settlement_status === "settled"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : payment.settlement_status === "failed"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    }
                    variant="outline"
                  >
                    {payment.settlement_status}
                  </Badge>
                </div>
                {payment.settlement_chain && (
                  <DetailItem
                    label="Settlement Chain"
                    value={payment.settlement_chain}
                  />
                )}
                {payment.settlement_token && (
                  <DetailItem
                    label="Settlement Token"
                    value={payment.settlement_token}
                  />
                )}
                {payment.intent_id && (
                  <DetailItem
                    label="Intent ID"
                    value={truncateAddress(payment.intent_id, 10)}
                    copyValue={payment.intent_id}
                    isHash
                  />
                )}
                {payment.settled_at && (
                  <DetailItem
                    label="Settled At"
                    value={formatDate(payment.settled_at)}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Deposit Address QR Code */}
          {payment.deposit_address &&
            (payment.status === "pending" || payment.status === "processing" ||
             payment.settlement_status === "pending") && (
            <Card>
              <CardHeader>
                <CardTitle>Deposit QR</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementQR depositAddress={payment.deposit_address} />
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailItem label="Payment ID" value={payment.id} copyValue={payment.id} isHash />
              {payment.external_order_id && (
                <DetailItem label="Order ID" value={payment.external_order_id} />
              )}
              {payment.deposit_address && (
                <DetailItem
                  label="Deposit Address"
                  value={truncateAddress(payment.deposit_address, 10)}
                  copyValue={payment.deposit_address}
                  isHash
                />
              )}
              {payment.return_url && (
                <DetailItem label="Return URL" value={payment.return_url} />
              )}
              {payment.expires_at && (
                <DetailItem label="Expires" value={formatDate(payment.expires_at)} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  copyValue,
  isHash,
}: {
  label: string;
  value: string;
  copyValue?: string;
  isHash?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm text-white ${isHash ? "font-mono" : ""}`}>{value}</p>
        {copyValue && (
          <CopyButton value={copyValue} />
        )}
      </div>
    </div>
  );
}

function TxHashItem({
  label,
  txHash,
  chain,
}: {
  label: string;
  txHash: string;
  chain: string | null;
}) {
  const explorerUrl = chain ? getExplorerTxUrl(chain, txHash) : null;

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-white font-mono">
          {truncateAddress(txHash, 10)}
        </p>
        <CopyButton value={txHash} />
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
            title="View on explorer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

