import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface PaymentFailedEmailProps {
  amount: string;
  currency: string;
  orderId: string | null;
  reason: string;
  paymentId: string;
  time: string;
}

export function PaymentFailedEmail({
  amount,
  currency,
  orderId,
  reason,
  paymentId,
  time,
}: PaymentFailedEmailProps) {
  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
        Payment Failed
      </h1>
      <p style={{ color: "#ef4444", fontSize: "28px", fontWeight: "bold", margin: "0 0 24px" }}>
        ${amount} {currency}
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <EmailRow label="Amount" value={`$${amount} ${currency}`} />
          {orderId && <EmailRow label="Order ID" value={orderId} />}
          <EmailRow label="Reason" value={reason} />
          <EmailRow label="Time" value={time} />
        </tbody>
      </table>

      <EmailButton href={emailUrl(`/dashboard/payments/${paymentId}`)}>View Details</EmailButton>
    </EmailLayout>
  );
}
