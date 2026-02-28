import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface PaymentReceivedEmailProps {
  amount: string;
  currency: string;
  customerWallet: string;
  token: string;
  chain: string;
  orderId: string | null;
  txHash: string;
  explorerUrl: string | null;
  paymentId: string;
  time: string;
}

export function PaymentReceivedEmail({
  amount,
  currency,
  customerWallet,
  token,
  chain,
  orderId,
  txHash,
  explorerUrl,
  paymentId,
  time,
}: PaymentReceivedEmailProps) {
  const truncatedWallet = customerWallet
    ? `${customerWallet.slice(0, 6)}...${customerWallet.slice(-4)}`
    : "Unknown";

  const txDisplay = txHash
    ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}`
    : "Pending";

  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
        Payment Received
      </h1>
      <p style={{ color: "#10b981", fontSize: "28px", fontWeight: "bold", margin: "0 0 24px" }}>
        ${amount} {currency}
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <EmailRow label="Amount" value={`$${amount} ${currency}`} />
          <EmailRow label="From" value={truncatedWallet} />
          <EmailRow label="Token" value={token} />
          <EmailRow label="Chain" value={chain} />
          {orderId && <EmailRow label="Order ID" value={orderId} />}
          <EmailRow
            label="TX Hash"
            value={
              explorerUrl ? (
                <a href={explorerUrl} style={{ color: "#60a5fa", textDecoration: "underline", fontFamily: "monospace" }}>
                  {txDisplay}
                </a>
              ) : (
                <span style={{ fontFamily: "monospace" }}>{txDisplay}</span>
              )
            }
          />
          <EmailRow label="Time" value={time} />
        </tbody>
      </table>

      <EmailButton href={emailUrl(`/dashboard/payments/${paymentId}`)}>View Payment</EmailButton>
    </EmailLayout>
  );
}
