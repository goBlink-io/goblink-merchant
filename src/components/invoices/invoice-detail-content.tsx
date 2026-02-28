"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Printer,
  Loader2,
  FileText,
  Clock,
  Mail,
  Eye,
  CreditCard,
  Pencil,
} from "lucide-react";
import Link from "next/link";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_total: number;
  total: number;
  currency: string;
  status: string;
  due_date: string | null;
  memo: string | null;
  payment_terms: string | null;
  payment_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InvoiceDetailContentProps {
  invoice: Invoice;
  merchantName: string;
}

function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "sent":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "viewed":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "paid":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "overdue":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

export function InvoiceDetailContent({
  invoice: initialInvoice,
  merchantName,
}: InvoiceDetailContentProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleSend() {
    setActionLoading("send");
    try {
      const res = await fetch(`/api/v1/internal/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid() {
    setActionLoading("markPaid");
    try {
      const res = await fetch(`/api/v1/internal/invoices/${invoice.id}/mark-paid`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
      }
    } finally {
      setActionLoading(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Status timeline events
  const timelineEvents = [
    { label: "Created", date: invoice.created_at, icon: FileText, always: true },
    { label: "Sent", date: invoice.sent_at, icon: Mail, always: false },
    { label: "Viewed", date: invoice.viewed_at, icon: Eye, always: false },
    { label: "Paid", date: invoice.paid_at, icon: CreditCard, always: false },
  ];

  return (
    <>
      {/* Header - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {invoice.invoice_number}
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              Invoice details
            </p>
          </div>
          <Badge
            className={getInvoiceStatusColor(invoice.status)}
            variant="outline"
          >
            {invoice.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "draft" && (
            <Link href={`/dashboard/invoices/${invoice.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
          {invoice.status !== "paid" && (
            <>
              {(invoice.status === "draft" || invoice.status === "sent") &&
                invoice.recipient_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSend}
                    disabled={actionLoading === "send"}
                    className="gap-2"
                  >
                    {actionLoading === "send" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {invoice.status === "draft" ? "Send" : "Resend"}
                  </Button>
                )}
              <Button
                size="sm"
                onClick={handleMarkPaid}
                disabled={actionLoading === "markPaid"}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {actionLoading === "markPaid" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Mark Paid
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice document */}
        <div className="lg:col-span-2">
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="p-8">
              {/* Invoice header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white print:text-black">
                    INVOICE
                  </h2>
                  <p className="text-sm text-zinc-400 print:text-gray-600 mt-1">
                    {invoice.invoice_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white print:text-black">
                    {merchantName || "goBlink Merchant"}
                  </p>
                </div>
              </div>

              {/* Bill to + dates */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider mb-2">
                    Bill To
                  </p>
                  <p className="text-sm text-white print:text-black font-medium">
                    {invoice.recipient_name || "--"}
                  </p>
                  {invoice.recipient_email && (
                    <p className="text-sm text-zinc-400 print:text-gray-600">
                      {invoice.recipient_email}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 print:text-gray-500">
                      <span className="uppercase tracking-wider">Date: </span>
                      <span className="text-zinc-300 print:text-black">
                        {new Date(invoice.created_at).toLocaleDateString(
                          "en-US",
                          { month: "long", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    </p>
                    {invoice.due_date && (
                      <p className="text-xs text-zinc-500 print:text-gray-500">
                        <span className="uppercase tracking-wider">Due: </span>
                        <span className="text-zinc-300 print:text-black">
                          {new Date(invoice.due_date).toLocaleDateString(
                            "en-US",
                            { month: "long", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-zinc-700 print:border-gray-300">
                    <th className="text-left text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider pb-3">
                      Description
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider pb-3 w-20">
                      Qty
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider pb-3 w-28">
                      Unit Price
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider pb-3 w-28">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.line_items as LineItem[]).map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-zinc-800/50 print:border-gray-200"
                    >
                      <td className="py-3 text-sm text-white print:text-black">
                        {item.description}
                      </td>
                      <td className="py-3 text-sm text-zinc-300 print:text-gray-700 text-right">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-sm text-zinc-300 print:text-gray-700 text-right">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </td>
                      <td className="py-3 text-sm text-white print:text-black text-right font-medium">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 print:text-gray-600">
                      Subtotal
                    </span>
                    <span className="text-white print:text-black">
                      {formatCurrency(Number(invoice.subtotal), invoice.currency)}
                    </span>
                  </div>
                  {Number(invoice.tax_rate) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 print:text-gray-600">
                        Tax ({invoice.tax_rate}%)
                      </span>
                      <span className="text-white print:text-black">
                        {formatCurrency(
                          Number(invoice.tax_total),
                          invoice.currency
                        )}
                      </span>
                    </div>
                  )}
                  <Separator className="print:bg-gray-300" />
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-white print:text-black">Total</span>
                    <span className="text-white print:text-black">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Memo */}
              {invoice.memo && (
                <div className="mt-8 pt-6 border-t border-zinc-800 print:border-gray-200">
                  <p className="text-xs font-medium text-zinc-500 print:text-gray-500 uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-zinc-300 print:text-gray-700">
                    {invoice.memo}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status timeline - hidden when printing */}
        <div className="print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-zinc-400" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineEvents.map((event) => {
                  if (!event.always && !event.date) return null;
                  const Icon = event.icon;
                  const completed = !!event.date;

                  return (
                    <div key={event.label} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 p-1.5 rounded-full ${
                          completed
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-600"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            completed ? "text-white" : "text-zinc-600"
                          }`}
                        >
                          {event.label}
                        </p>
                        {event.date && (
                          <p className="text-xs text-zinc-500">
                            {formatDate(event.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-gray-500 {
            color: #6b7280 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:border-gray-200 {
            border-color: #e5e7eb !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:bg-gray-300 {
            background-color: #d1d5db !important;
          }
          nav,
          aside,
          header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
