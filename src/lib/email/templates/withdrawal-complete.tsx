import * as React from "react";
import { EmailLayout, EmailButton, EmailRow, emailUrl } from "./layout";

interface WithdrawalCompleteEmailProps {
  amount: string;
  currency: string;
  destinationAddress: string;
  chain: string;
  token: string;
  txHash: string;
  explorerUrl: string | null;
  time: string;
}

export function WithdrawalCompleteEmail({
  amount,
  currency,
  destinationAddress,
  chain,
  token,
  txHash,
  explorerUrl,
  time,
}: WithdrawalCompleteEmailProps) {
  const truncatedAddress = destinationAddress
    ? `${destinationAddress.slice(0, 6)}...${destinationAddress.slice(-4)}`
    : "Unknown";

  const txDisplay = txHash
    ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}`
    : "Pending";

  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
        Withdrawal Complete
      </h1>
      <p style={{ color: "#10b981", fontSize: "28px", fontWeight: "bold", margin: "0 0 24px" }}>
        ${amount} {currency}
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <EmailRow label="Amount" value={`$${amount} ${currency}`} />
          <EmailRow label="Destination" value={<span style={{ fontFamily: "monospace" }}>{truncatedAddress}</span>} />
          <EmailRow label="Chain" value={chain} />
          <EmailRow label="Token" value={token} />
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

      <EmailButton href={emailUrl("/dashboard/wallet")}>View Withdrawal</EmailButton>
    </EmailLayout>
  );
}
