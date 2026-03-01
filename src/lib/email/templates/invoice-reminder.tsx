import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface InvoiceReminderEmailProps {
  invoiceNumber: string;
  recipientName: string;
  total: string;
  currency: string;
  dueDate: string;
  merchantName: string;
  payUrl: string;
  daysOverdue: number;
}

export function InvoiceReminderEmail({
  invoiceNumber,
  recipientName,
  total,
  currency,
  dueDate,
  merchantName,
  payUrl,
  daysOverdue,
}: InvoiceReminderEmailProps) {
  return (
    <EmailLayout>
      <h1
        style={{
          color: "#fafafa",
          fontSize: "20px",
          fontWeight: "600",
          margin: "0 0 8px",
        }}
      >
        Reminder: Invoice {invoiceNumber} is overdue
      </h1>
      <p
        style={{
          color: "#a1a1aa",
          fontSize: "14px",
          lineHeight: "22px",
          margin: "0 0 24px",
        }}
      >
        Hi {recipientName || "there"}, this is a friendly reminder that your
        invoice from {merchantName} was due on {dueDate} ({daysOverdue}{" "}
        {daysOverdue === 1 ? "day" : "days"} ago).
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tbody>
          <EmailRow label="Invoice" value={invoiceNumber} />
          <EmailRow label="Amount" value={`${total} ${currency}`} />
          <EmailRow label="Due Date" value={dueDate} />
        </tbody>
      </table>

      <EmailButton href={payUrl}>Pay Now</EmailButton>

      <p
        style={{
          color: "#71717a",
          fontSize: "12px",
          marginTop: "24px",
          lineHeight: "18px",
        }}
      >
        This reminder was sent via{" "}
        <a
          href={emailUrl("/")}
          style={{ color: "#71717a", textDecoration: "underline" }}
        >
          goBlink Merchant
        </a>
        .
      </p>
    </EmailLayout>
  );
}
