"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  FileText,
  Search,
  Send,
  CheckCircle,
  Trash2,
  Eye,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
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
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface InvoicesContentProps {
  merchantId: string;
  initialInvoices: Invoice[];
  currency: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

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
    case "cancelled":
      return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

export function InvoicesContent({
  merchantId,
  initialInvoices,
  currency,
}: InvoicesContentProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/v1/internal/invoices?${params}`);
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  async function handleSend(invoiceId: string) {
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/v1/internal/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (res.ok) fetchInvoices();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid(invoiceId: string) {
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/v1/internal/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
      });
      if (res.ok) fetchInvoices();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(invoiceId: string) {
    setActionLoading(invoiceId);
    try {
      const res = await fetch(`/api/v1/internal/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchInvoices();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TABS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Invoice list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No invoices</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {statusFilter !== "all"
                  ? "Try adjusting your filter."
                  : "Create your first invoice to get started."}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <div className="col-span-2">Number</div>
                <div className="col-span-3">Recipient</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Due Date</div>
                <div className="col-span-2"></div>
              </div>

              {/* Rows */}
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
                >
                  <div className="col-span-2">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-white truncate">
                      {invoice.recipient_name || "--"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {invoice.recipient_email || ""}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <Badge
                      className={getInvoiceStatusColor(invoice.status)}
                      variant="outline"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 hidden md:block">
                    <span className="text-sm text-zinc-400">
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-500 hover:text-blue-400 h-8 w-8"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {(invoice.status === "draft" || invoice.status === "sent") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-500 hover:text-blue-400 h-8 w-8"
                        title="Send"
                        onClick={() => handleSend(invoice.id)}
                        disabled={actionLoading === invoice.id || !invoice.recipient_email}
                      >
                        {actionLoading === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {invoice.status !== "paid" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-500 hover:text-emerald-400 h-8 w-8"
                        title="Mark Paid"
                        onClick={() => handleMarkPaid(invoice.id)}
                        disabled={actionLoading === invoice.id}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {invoice.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-500 hover:text-red-400 h-8 w-8"
                        title="Delete"
                        onClick={() => handleDelete(invoice.id)}
                        disabled={actionLoading === invoice.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        currency={currency}
        onCreated={() => {
          setCreateOpen(false);
          fetchInvoices();
        }}
      />
    </>
  );
}

/* ─── Create Invoice Dialog ─── */

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  onCreated: () => void;
}

function CreateInvoiceDialog({
  open,
  onOpenChange,
  currency,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [creating, setCreating] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lineItems, setLineItems] = useState<
    Array<{ description: string; quantity: string; unit_price: string }>
  >([{ description: "", quantity: "1", unit_price: "" }]);

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: "1", unit_price: "" }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(
    index: number,
    field: "description" | "quantity" | "unit_price",
    value: string
  ) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const rate = parseFloat(taxRate) || 0;
  const taxAmount = Math.round(subtotal * (rate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  async function handleCreate(sendAfter: boolean) {
    setCreating(true);
    try {
      const items = lineItems
        .filter((item) => item.description && item.unit_price)
        .map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        }));

      if (items.length === 0) return;

      const res = await fetch("/api/v1/internal/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_name: recipientName || undefined,
          recipient_email: recipientEmail || undefined,
          line_items: items,
          tax_rate: rate,
          due_date: dueDate || undefined,
          memo: memo || undefined,
          currency,
        }),
      });

      if (res.ok && sendAfter) {
        const invoice = await res.json();
        if (invoice.id && recipientEmail) {
          await fetch(`/api/v1/internal/invoices/${invoice.id}/send`, {
            method: "POST",
          });
        }
      }

      if (res.ok) {
        // Reset form
        setRecipientName("");
        setRecipientEmail("");
        setDueDate("");
        setMemo("");
        setTaxRate("0");
        setLineItems([{ description: "", quantity: "1", unit_price: "" }]);
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice. Save as draft or send immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Due date + Memo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Memo / Payment Terms</Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Net 30, thank you for your business"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </Button>
            </div>

            {/* Line items header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {lineItems.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unit_price) || 0;
              const amount = Math.round(qty * price * 100) / 100;

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, "quantity", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(index, "unit_price", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-sm text-zinc-300 text-right pr-2">
                    {formatCurrency(amount, currency)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>
            {rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Tax ({rate}%)</span>
                <span className="text-white">
                  {formatCurrency(taxAmount, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span className="text-white">Total</span>
              <span className="text-white">{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCreate(false)}
            disabled={creating || lineItems.every((i) => !i.description || !i.unit_price)}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Draft
          </Button>
          <Button
            onClick={() => handleCreate(true)}
            disabled={creating || !recipientEmail || lineItems.every((i) => !i.description || !i.unit_price)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
