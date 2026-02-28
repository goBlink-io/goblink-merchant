import * as React from "react";
import { EmailLayout, EmailButton, emailUrl } from "./layout";

interface WeeklySummaryEmailProps {
  totalRevenue: string;
  currency: string;
  paymentCount: number;
  topToken: string;
  topChain: string;
  comparedToLastWeek: number; // percentage change, e.g. 12.5 or -5.3
  openTickets: number;
}

export function WeeklySummaryEmail({
  totalRevenue,
  currency,
  paymentCount,
  topToken,
  topChain,
  comparedToLastWeek,
  openTickets,
}: WeeklySummaryEmailProps) {
  const trendColor = comparedToLastWeek >= 0 ? "#10b981" : "#ef4444";
  const trendSymbol = comparedToLastWeek >= 0 ? "+" : "";

  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
        Your Weekly Summary
      </h1>
      <p style={{ color: "#a1a1aa", fontSize: "14px", margin: "0 0 24px" }}>
        Here&apos;s how your business performed this week.
      </p>

      {/* Revenue highlight */}
      <table cellPadding="0" cellSpacing="0" width="100%">
        <tbody>
          <tr>
            <td
              align="center"
              style={{
                padding: "24px",
                backgroundColor: "#27272a",
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            >
              <p style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
                Revenue This Week
              </p>
              <p style={{ color: "#fafafa", fontSize: "32px", fontWeight: "bold", margin: "0 0 4px" }}>
                ${totalRevenue} {currency}
              </p>
              <p style={{ color: trendColor, fontSize: "14px", margin: 0 }}>
                {trendSymbol}{comparedToLastWeek.toFixed(1)}% vs last week
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Stats grid */}
      <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "12px", backgroundColor: "#27272a", borderRadius: "8px" }}>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px" }}>Payments</p>
              <p style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: 0 }}>{paymentCount}</p>
            </td>
            <td style={{ width: "8px" }} />
            <td style={{ width: "50%", padding: "12px", backgroundColor: "#27272a", borderRadius: "8px" }}>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px" }}>Open Tickets</p>
              <p style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: 0 }}>{openTickets}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table cellPadding="0" cellSpacing="0" width="100%" style={{ marginTop: "8px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "12px", backgroundColor: "#27272a", borderRadius: "8px" }}>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px" }}>Top Token</p>
              <p style={{ color: "#fafafa", fontSize: "16px", fontWeight: "bold", margin: 0 }}>{topToken}</p>
            </td>
            <td style={{ width: "8px" }} />
            <td style={{ width: "50%", padding: "12px", backgroundColor: "#27272a", borderRadius: "8px" }}>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 4px" }}>Top Chain</p>
              <p style={{ color: "#fafafa", fontSize: "16px", fontWeight: "bold", margin: 0 }}>{topChain}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <EmailButton href={emailUrl("/dashboard")}>View Dashboard</EmailButton>
    </EmailLayout>
  );
}
