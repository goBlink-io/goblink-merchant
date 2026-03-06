import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface InvoiceSentEmailProps {
  invoiceNumber: string;
  recipientName: string;
  total: string;
  currency: string;
  dueDate: string;
  memo: string | null;
  payUrl: string;
}

export function InvoiceSentEmail({
  invoiceNumber,
  recipientName,
  total,
  currency,
  dueDate,
  memo,
  payUrl,
}: InvoiceSentEmailProps) {
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
        Invoice {invoiceNumber}
      </h1>
      <p
        style={{
          color: "#a1a1aa",
          fontSize: "14px",
          lineHeight: "22px",
          margin: "0 0 24px",
        }}
      >
        Hi {recipientName || "there"}, you have a new invoice.
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tbody>
          <EmailRow label="Invoice" value={invoiceNumber} />
          <EmailRow label="Amount" value={`${total} ${currency}`} />
          <EmailRow label="Due Date" value={dueDate} />
          {memo && <EmailRow label="Memo" value={memo} />}
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
        This invoice was sent via{" "}
        <a href={emailUrl("/")} style={{ color: "#71717a", textDecoration: "underline" }}>
          goBlink Merchant
        </a>
        .
      </p>
    </EmailLayout>
  );
}
