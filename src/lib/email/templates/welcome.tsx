import * as React from "react";
import { EmailLayout, EmailButton, emailUrl } from "./layout";

interface WelcomeEmailProps {
  businessName: string;
}

export function WelcomeEmail({ businessName }: WelcomeEmailProps) {
  return (
    <EmailLayout>
      <h1 style={{ color: "#fafafa", fontSize: "20px", fontWeight: "bold", margin: "0 0 16px" }}>
        Welcome to goBlink Merchant!
      </h1>
      <p style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: "24px", margin: "0 0 24px" }}>
        Hi {businessName}, your merchant account is ready. Start accepting crypto payments in minutes.
      </p>

      <table cellPadding="0" cellSpacing="0" width="100%">
        <tbody>
          <tr>
            <td style={{ padding: "12px 16px", backgroundColor: "#27272a", borderRadius: "8px" }}>
              <table cellPadding="0" cellSpacing="0" width="100%">
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#fafafa", fontSize: "14px" }}>
                      <strong style={{ color: "#2563EB" }}>1.</strong>{" "}
                      Complete your business profile in Settings
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#fafafa", fontSize: "14px" }}>
                      <strong style={{ color: "#7C3AED" }}>2.</strong>{" "}
                      Create your first payment link
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#fafafa", fontSize: "14px" }}>
                      <strong style={{ color: "#2563EB" }}>3.</strong>{" "}
                      Install our WooCommerce plugin for your store
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <EmailButton href={emailUrl("/dashboard")}>Go to Dashboard</EmailButton>
    </EmailLayout>
  );
}
