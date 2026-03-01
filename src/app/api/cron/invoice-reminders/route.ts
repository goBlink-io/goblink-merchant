import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { apiError, apiSuccess } from "@/lib/api-response";
import { sendEmail } from "@/lib/email/client";
import { InvoiceReminderEmail } from "@/lib/email/templates/invoice-reminder";
import { insertNotification } from "@/lib/notifications";
import React from "react";

// GET /api/cron/invoice-reminders — Vercel Cron endpoint.
// Sends reminder emails for overdue unpaid invoices.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return apiError("CRON_SECRET not configured", 500);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const now = new Date();
  const results = { reminded: 0, notified: 0, skipped: 0, errors: 0 };

  // Fetch unpaid invoices past due_date
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, currency, due_date, customer_email, customer_name, merchant_id, metadata")
    .eq("status", "sent")
    .lt("due_date", now.toISOString())
    .order("due_date", { ascending: true });

  if (error) {
    console.error("[invoice-reminders] Query error:", error);
    return apiError("Failed to query invoices", 500);
  }

  if (!invoices || invoices.length === 0) {
    return apiSuccess({ message: "No overdue invoices", ...results });
  }

  for (const invoice of invoices) {
    try {
      if (!invoice.customer_email) {
        results.skipped++;
        continue;
      }

      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Parse reminder metadata
      const meta = (invoice.metadata as Record<string, unknown>) || {};
      const reminderCount = (meta.reminder_count as number) || 0;
      const lastReminderSent = meta.last_reminder_sent as string | null;

      // Skip if already reminded recently (within 24h)
      if (lastReminderSent) {
        const lastSent = new Date(lastReminderSent);
        if (now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000) {
          results.skipped++;
          continue;
        }
      }

      // Day 1 overdue: first reminder
      // Day 7+ overdue: second reminder (if only 1 sent so far)
      // Day 14+ overdue: notify merchant
      if (daysOverdue >= 14 && reminderCount >= 2) {
        // Notify merchant that invoice is significantly overdue
        const { data: merchant } = await supabase
          .from("merchants")
          .select("business_name")
          .eq("id", invoice.merchant_id)
          .single();

        await insertNotification(
          invoice.merchant_id,
          "system",
          `Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
          `Invoice for ${invoice.amount} ${invoice.currency} to ${invoice.customer_name || invoice.customer_email} remains unpaid.`,
          `/dashboard/invoices`,
        );

        // Update metadata to avoid repeated notifications
        await supabase
          .from("invoices")
          .update({
            metadata: {
              ...meta,
              last_reminder_sent: now.toISOString(),
              reminder_count: reminderCount + 1,
            },
          })
          .eq("id", invoice.id);

        results.notified++;
        continue;
      }

      // Send customer reminder at day 1 or day 7
      if (
        (daysOverdue >= 1 && reminderCount === 0) ||
        (daysOverdue >= 7 && reminderCount === 1)
      ) {
        const { data: merchant } = await supabase
          .from("merchants")
          .select("business_name")
          .eq("id", invoice.merchant_id)
          .single();

        const payUrl = `https://merchant.goblink.io/pay/invoice/${invoice.id}`;

        await sendEmail({
          to: invoice.customer_email,
          subject: `Reminder: Invoice #${invoice.invoice_number} from ${merchant?.business_name || "goBlink Merchant"} is overdue`,
          react: React.createElement(InvoiceReminderEmail, {
            invoiceNumber: invoice.invoice_number,
            recipientName: invoice.customer_name || "",
            total: String(invoice.amount),
            currency: invoice.currency,
            dueDate: dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            merchantName: merchant?.business_name || "goBlink Merchant",
            payUrl,
            daysOverdue,
          }),
        } as { to: string; subject: string; react: React.ReactElement });

        // Update metadata
        await supabase
          .from("invoices")
          .update({
            metadata: {
              ...meta,
              last_reminder_sent: now.toISOString(),
              reminder_count: reminderCount + 1,
            },
          })
          .eq("id", invoice.id);

        results.reminded++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`[invoice-reminders] Error processing invoice ${invoice.id}:`, err);
      results.errors++;
    }
  }

  console.log("[invoice-reminders] Done:", results);
  return apiSuccess({ message: "Invoice reminders processed", ...results });
}
