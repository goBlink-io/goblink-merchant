import * as React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";

interface EmailLayoutProps {
  children: React.ReactNode;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <table
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      style={{ backgroundColor: "#09090b", fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ padding: "40px 20px" }}>
            <table
              width="600"
              cellPadding="0"
              cellSpacing="0"
              style={{ maxWidth: "600px", width: "100%" }}
            >
              <tbody>
                {/* Logo */}
                <tr>
                  <td align="center" style={{ paddingBottom: "32px" }}>
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "#2563EB",
                      }}
                    >
                      goBlink Merchant
                    </span>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#18181b",
                      borderRadius: "12px",
                      padding: "32px",
                      border: "1px solid #27272a",
                    }}
                  >
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    align="center"
                    style={{
                      paddingTop: "32px",
                      color: "#52525b",
                      fontSize: "12px",
                      lineHeight: "20px",
                    }}
                  >
                    <p style={{ margin: "0 0 8px" }}>
                      &copy; 2026 goBlink &middot;{" "}
                      <a href="https://goblink.io" style={{ color: "#71717a", textDecoration: "underline" }}>
                        goblink.io
                      </a>
                    </p>
                    <p style={{ margin: 0 }}>
                      You&apos;re receiving this because you have a goBlink Merchant account.
                      <br />
                      <a
                        href={`${APP_URL}/dashboard/settings#notifications`}
                        style={{ color: "#71717a", textDecoration: "underline" }}
                      >
                        Manage notification preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <table cellPadding="0" cellSpacing="0" style={{ marginTop: "24px" }}>
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: "#2563EB",
              borderRadius: "8px",
              padding: "12px 24px",
            }}
          >
            <a
              href={href}
              style={{
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface EmailRowProps {
  label: string;
  value: React.ReactNode;
}

export function EmailRow({ label, value }: EmailRowProps) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 0",
          color: "#a1a1aa",
          fontSize: "13px",
          width: "140px",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "8px 0",
          color: "#fafafa",
          fontSize: "13px",
          verticalAlign: "top",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export function emailUrl(path: string): string {
  return `${APP_URL}${path}`;
}
