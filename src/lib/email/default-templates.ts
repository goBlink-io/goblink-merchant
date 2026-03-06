/**
 * Default email template content — used for "Reset to Default" in admin editor.
 * Must match the seed data in 00007_email_templates.sql.
 */

interface DefaultTemplate {
  subject: string;
  body_html: string;
  body_text: string;
}

const HEADER = `<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>`;

const FOOTER = `<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
</td></tr>`;

const FOOTER_WITH_PREFS = `<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>`;

function wrap(content: string, footer: string = FOOTER): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
${HEADER}
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
${content}
</td></tr>
${footer}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="${href}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${label}</a>
  </td></tr>
  </table>`;
}

const defaults: Record<string, DefaultTemplate> = {
  verification: {
    subject: "Verify your email — goBlink Merchant",
    body_html: wrap(
      `<h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Verify your email</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, please verify your email address to get started with goBlink Merchant.
  </p>
  ${button("{{verification_url}}", "Verify Email")}
  <p style="color:#52525b;font-size:12px;line-height:18px;margin:24px 0 0;">
    If you didn't create this account, you can safely ignore this email.
  </p>`
    ),
    body_text: `Hi {{business_name}}, please verify your email to get started with goBlink Merchant. Click here: {{verification_url}}

If you didn't create this account, you can safely ignore this email.

© 2026 goBlink · goblink.io`,
  },

  password_reset: {
    subject: "Reset your password — goBlink Merchant",
    body_html: wrap(
      `<h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Reset your password</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, click the button below to reset your password.
  </p>
  ${button("{{reset_url}}", "Reset Password")}
  <p style="color:#52525b;font-size:12px;line-height:18px;margin:24px 0 0;">
    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
  </p>`
    ),
    body_text: `Hi {{business_name}}, click here to reset your password: {{reset_url}}

This link expires in 1 hour. If you didn't request a password reset, ignore this email.

© 2026 goBlink · goblink.io`,
  },

  welcome: {
    subject: "Welcome to goBlink Merchant! \ud83c\udf89",
    body_html: wrap(
      `<h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Welcome to goBlink Merchant!</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, your account is verified and ready to go. Here's how to get started:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:12px 16px;background-color:#27272a;border-radius:8px;">
    <p style="color:#fafafa;font-size:14px;font-weight:600;margin:0 0 4px;">1. Complete your setup</p>
    <p style="color:#a1a1aa;font-size:13px;margin:0;">Add your wallet address and business details in Settings.</p>
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="padding:12px 16px;background-color:#27272a;border-radius:8px;">
    <p style="color:#fafafa;font-size:14px;font-weight:600;margin:0 0 4px;">2. Create a payment link</p>
    <p style="color:#a1a1aa;font-size:13px;margin:0;">Generate your first payment link or integrate with our API.</p>
  </td></tr>
  <tr><td style="height:8px;"></td></tr>
  <tr><td style="padding:12px 16px;background-color:#27272a;border-radius:8px;">
    <p style="color:#fafafa;font-size:14px;font-weight:600;margin:0 0 4px;">3. Install a plugin</p>
    <p style="color:#a1a1aa;font-size:13px;margin:0;">Connect goBlink to WooCommerce, Shopify, or your custom store.</p>
  </td></tr>
  </table>
  ${button("{{dashboard_url}}", "Go to Dashboard")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Welcome to goBlink Merchant, {{business_name}}!

Your account is verified and ready to go. Here's how to get started:

1. Complete your setup — Add your wallet address and business details in Settings.
2. Create a payment link — Generate your first payment link or integrate with our API.
3. Install a plugin — Connect goBlink to WooCommerce, Shopify, or your custom store.

Go to your dashboard: {{dashboard_url}}

© 2026 goBlink · goblink.io`,
  },

  payment_received: {
    subject: "Payment received: ${{amount}} {{currency}}",
    body_html: wrap(
      `<div style="text-align:center;padding:16px;background-color:#052e16;border:1px solid #166534;border-radius:8px;margin-bottom:24px;">
    <p style="color:#4ade80;font-size:13px;margin:0 0 4px;">Payment Confirmed</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">\${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 16px;">Payment Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Amount</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{crypto_amount}} {{crypto_token}} on {{crypto_chain}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">From</td><td style="padding:8px 0;color:#fafafa;font-size:13px;word-break:break-all;">{{customer_wallet}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Order ID</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{order_id}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">TX Hash</td><td style="padding:8px 0;color:#fafafa;font-size:13px;word-break:break-all;">{{tx_hash}}</td></tr>
  </table>
  ${button("{{payment_url}}", "View Payment")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Payment received: \${{amount}} {{currency}}

Hi {{business_name}}, you received a payment.

Amount: {{crypto_amount}} {{crypto_token}} on {{crypto_chain}}
From: {{customer_wallet}}
Order ID: {{order_id}}
TX Hash: {{tx_hash}}

View payment: {{payment_url}}

© 2026 goBlink · goblink.io`,
  },

  payment_failed: {
    subject: "Payment failed: ${{amount}} {{currency}}",
    body_html: wrap(
      `<div style="text-align:center;padding:16px;background-color:#450a0a;border:1px solid #991b1b;border-radius:8px;margin-bottom:24px;">
    <p style="color:#f87171;font-size:13px;margin:0 0 4px;">Payment Failed</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">\${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 12px;">What happened</h2>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">{{reason}}</p>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Order ID</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{order_id}}</td></tr>
  </table>
  ${button("{{payment_url}}", "View Details")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Payment failed: \${{amount}} {{currency}}

Hi {{business_name}}, a payment has failed.

Reason: {{reason}}
Order ID: {{order_id}}

View details: {{payment_url}}

© 2026 goBlink · goblink.io`,
  },

  ticket_reply: {
    subject: "New reply on: {{ticket_subject}}",
    body_html: wrap(
      `<h1 style="color:#fafafa;font-size:20px;margin:0 0 8px;">New reply on your ticket</h1>
  <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">{{ticket_subject}}</p>
  <div style="padding:16px;border-left:3px solid #2563EB;background-color:#27272a;border-radius:0 8px 8px 0;margin-bottom:24px;">
    <p style="color:#d4d4d8;font-size:14px;line-height:22px;margin:0;">{{message_preview}}</p>
  </div>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr><td style="padding:4px 8px;background-color:#27272a;border-radius:4px;color:#a1a1aa;font-size:12px;">
    Status: <span style="color:#fafafa;">{{ticket_status}}</span>
  </td></tr>
  </table>
  ${button("{{ticket_url}}", "View Ticket")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `New reply on your ticket: {{ticket_subject}}

Hi {{business_name}}, there's a new reply on your support ticket.

"{{message_preview}}"

Status: {{ticket_status}}

View ticket: {{ticket_url}}

© 2026 goBlink · goblink.io`,
  },

  withdrawal_complete: {
    subject: "Withdrawal complete: ${{amount}} {{currency}}",
    body_html: wrap(
      `<div style="text-align:center;padding:16px;background-color:#052e16;border:1px solid #166534;border-radius:8px;margin-bottom:24px;">
    <p style="color:#4ade80;font-size:13px;margin:0 0 4px;">Withdrawal Complete</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">\${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 16px;">Withdrawal Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Destination</td><td style="padding:8px 0;color:#fafafa;font-size:13px;word-break:break-all;">{{destination_address}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Chain</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{destination_chain}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Token</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{destination_token}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">TX Hash</td><td style="padding:8px 0;color:#fafafa;font-size:13px;word-break:break-all;">{{tx_hash}}</td></tr>
  </table>
  ${button("{{wallet_url}}", "View Wallet")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Withdrawal complete: \${{amount}} {{currency}}

Hi {{business_name}}, your withdrawal has been processed.

Destination: {{destination_address}}
Chain: {{destination_chain}}
Token: {{destination_token}}
TX Hash: {{tx_hash}}

View wallet: {{wallet_url}}

© 2026 goBlink · goblink.io`,
  },

  refund_issued: {
    subject: "Refund issued: ${{amount}} {{currency}}",
    body_html: wrap(
      `<div style="text-align:center;padding:16px;background-color:#2e1065;border:1px solid #6d28d9;border-radius:8px;margin-bottom:24px;">
    <p style="color:#a78bfa;font-size:13px;margin:0 0 4px;">Refund Issued</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">\${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 16px;">Refund Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Refund Amount</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">\${{amount}} {{currency}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Original Payment</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">\${{original_amount}} {{currency}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Reason</td><td style="padding:8px 0;color:#fafafa;font-size:13px;">{{reason}}</td></tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr><td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Refund ID</td><td style="padding:8px 0;color:#fafafa;font-size:13px;font-family:monospace;">{{refund_id}}</td></tr>
  </table>
  ${button("{{payment_url}}", "View Payment")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Refund issued: \${{amount}} {{currency}}

Hi {{business_name}}, a refund has been issued.

Refund Amount: \${{amount}} {{currency}}
Original Payment: \${{original_amount}} {{currency}}
Reason: {{reason}}
Refund ID: {{refund_id}}

View payment: {{payment_url}}

© 2026 goBlink · goblink.io`,
  },

  weekly_summary: {
    subject: "Your weekly summary — ${{total_revenue}} earned",
    body_html: wrap(
      `<h1 style="color:#fafafa;font-size:20px;margin:0 0 24px;">Your weekly summary</h1>
  <div style="text-align:center;padding:20px;background-color:#27272a;border-radius:8px;margin-bottom:24px;">
    <p style="color:#a1a1aa;font-size:13px;margin:0 0 4px;">Total Revenue</p>
    <p style="color:#fafafa;font-size:32px;font-weight:bold;margin:0 0 8px;">\${{total_revenue}}</p>
    <p style="color:{{trend_color}};font-size:13px;margin:0;">{{trend_direction}} {{trend_percent}}% vs last week</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:8px;"><div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;"><p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Payments</p><p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{payment_count}}</p></div></td>
    <td width="50%" style="padding:8px;"><div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;"><p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Open Tickets</p><p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{open_tickets}}</p></div></td>
  </tr>
  <tr>
    <td width="50%" style="padding:8px;"><div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;"><p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Top Token</p><p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{top_token}}</p></div></td>
    <td width="50%" style="padding:8px;"><div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;"><p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Top Chain</p><p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{top_chain}}</p></div></td>
  </tr>
  </table>
  ${button("{{dashboard_url}}", "View Dashboard")}`,
      FOOTER_WITH_PREFS
    ),
    body_text: `Your weekly goBlink summary — \${{total_revenue}} earned

Hi {{business_name}}, here's your weekly summary:

Total Revenue: \${{total_revenue}} ({{trend_direction}} {{trend_percent}}% vs last week)
Payments: {{payment_count}}
Open Tickets: {{open_tickets}}
Top Token: {{top_token}}
Top Chain: {{top_chain}}

View dashboard: {{dashboard_url}}

© 2026 goBlink · goblink.io`,
  },
};

export function getDefaultTemplate(type: string): DefaultTemplate | null {
  return defaults[type] || null;
}
