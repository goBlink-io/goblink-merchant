import * as React from "react";
import { EmailLayout, EmailButton, emailUrl } from "./layout";

interface TicketReplyEmailProps {
  ticketSubject: string;
  ticketStatus: string;
  ticketId: string;
  messagePreview: string;
}

export function TicketReplyEmail({
  ticketSubject,
  ticketStatus,
  ticketId,
  messagePreview,
}: TicketReplyEmailProps) {
  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 8px" }}>
        New Reply on Your Ticket
      </h1>
      <p style={{ color: "#a1a1aa", fontSize: "14px", margin: "0 0 24px" }}>
        {ticketSubject}
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tbody>
          <tr>
            <td
              style={{
                padding: "16px",
                backgroundColor: "#27272a",
                borderRadius: "8px",
                borderLeft: "3px solid #2563EB",
              }}
            >
              <p style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: "22px", margin: 0 }}>
                {messagePreview}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ color: "#71717a", fontSize: "12px", marginTop: "16px" }}>
        Status: <span style={{ color: "#a1a1aa" }}>{ticketStatus}</span>
      </p>

      <EmailButton href={emailUrl(`/dashboard/support/${ticketId}`)}>View Ticket</EmailButton>
    </EmailLayout>
  );
}
