import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface RefundIssuedEmailProps {
  amount: string;
  currency: string;
  originalAmount: string;
  reason: string | null;
  paymentId: string;
  refundId: string;
  time: string;
}

export function RefundIssuedEmail({
  amount,
  currency,
  originalAmount,
  reason,
  paymentId,
  refundId,
  time,
}: RefundIssuedEmailProps) {
  return (
    <EmailLayout>
      <h1
        style={{
          color: "#fafafa",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 8px",
        }}
      >
        Refund Issued
      </h1>
      <p
        style={{
          color: "#a78bfa",
          fontSize: "28px",
          fontWeight: "bold",
          margin: "0 0 24px",
        }}
      >
        ${amount} {currency}
      </p>

      <table
        cellPadding="0"
        cellSpacing="0"
        width="100%"
        style={{ borderCollapse: "collapse" }}
      >
        <tbody>
          <EmailRow label="Refund Amount" value={`$${amount} ${currency}`} />
          <EmailRow
            label="Original Payment"
            value={`$${originalAmount} ${currency}`}
          />
          {reason && <EmailRow label="Reason" value={reason} />}
          <EmailRow
            label="Refund ID"
            value={
              <span style={{ fontFamily: "monospace" }}>
                {refundId.slice(0, 8)}...
              </span>
            }
          />
          <EmailRow label="Time" value={time} />
        </tbody>
      </table>

      <EmailButton href={emailUrl(`/dashboard/payments/${paymentId}`)}>
        View Payment
      </EmailButton>
    </EmailLayout>
  );
}
