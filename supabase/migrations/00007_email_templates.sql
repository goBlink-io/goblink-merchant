-- Email Templates — Admin-editable email templates stored in DB
-- No RLS: only accessed via service role from admin routes

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_email_templates_type ON email_templates(type);

-- ============================================================
-- Seed all 8 templates
-- ============================================================

INSERT INTO email_templates (type, name, subject, body_html, body_text, variables) VALUES

-- 1. Verification
('verification', 'Email Verification', 'Verify your email — goBlink Merchant',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Verify your email</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, please verify your email address to get started with goBlink Merchant.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{verification_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">Verify Email</a>
  </td></tr>
  </table>
  <p style="color:#52525b;font-size:12px;line-height:18px;margin:0;">
    If you didn't create this account, you can safely ignore this email.
  </p>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Hi {{business_name}}, please verify your email to get started with goBlink Merchant. Click here: {{verification_url}}

If you didn''t create this account, you can safely ignore this email.

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "verification_url", "description": "Email verification link"}]'::jsonb),

-- 2. Password Reset
('password_reset', 'Password Reset', 'Reset your password — goBlink Merchant',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Reset your password</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, click the button below to reset your password.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{reset_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">Reset Password</a>
  </td></tr>
  </table>
  <p style="color:#52525b;font-size:12px;line-height:18px;margin:0;">
    This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
  </p>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Hi {{business_name}}, click here to reset your password: {{reset_url}}

This link expires in 1 hour. If you didn''t request a password reset, ignore this email.

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "reset_url", "description": "Password reset link"}]'::jsonb),

-- 3. Welcome
('welcome', 'Welcome Email', 'Welcome to goBlink Merchant! 🎉',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#fafafa;font-size:20px;margin:0 0 16px;">Welcome to goBlink Merchant!</h1>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">
    Hi {{business_name}}, your account is verified and ready to go. Here's how to get started:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:12px 16px;background-color:#27272a;border-radius:8px;margin-bottom:8px;">
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
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{dashboard_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">Go to Dashboard</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Welcome to goBlink Merchant, {{business_name}}!

Your account is verified and ready to go. Here''s how to get started:

1. Complete your setup — Add your wallet address and business details in Settings.
2. Create a payment link — Generate your first payment link or integrate with our API.
3. Install a plugin — Connect goBlink to WooCommerce, Shopify, or your custom store.

Go to your dashboard: {{dashboard_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb),

-- 4. Payment Received
('payment_received', 'Payment Received', 'Payment received: ${{amount}} {{currency}}',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <div style="text-align:center;padding:16px;background-color:#052e16;border:1px solid #166534;border-radius:8px;margin-bottom:24px;">
    <p style="color:#4ade80;font-size:13px;margin:0 0 4px;">Payment Confirmed</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 16px;">Payment Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">Amount</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;">{{crypto_amount}} {{crypto_token}} on {{crypto_chain}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">From</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;word-break:break-all;">{{customer_wallet}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">Order ID</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;">{{order_id}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">TX Hash</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;word-break:break-all;">{{tx_hash}}</td>
  </tr>
  </table>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{payment_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">View Payment</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Payment received: ${{amount}} {{currency}}

Hi {{business_name}}, you received a payment.

Amount: {{crypto_amount}} {{crypto_token}} on {{crypto_chain}}
From: {{customer_wallet}}
Order ID: {{order_id}}
TX Hash: {{tx_hash}}

View payment: {{payment_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "amount", "description": "Fiat amount"}, {"name": "currency", "description": "Fiat currency code"}, {"name": "crypto_amount", "description": "Crypto amount received"}, {"name": "crypto_token", "description": "Token symbol (e.g. USDC)"}, {"name": "crypto_chain", "description": "Blockchain name (e.g. Base)"}, {"name": "customer_wallet", "description": "Customer wallet address"}, {"name": "order_id", "description": "Merchant order ID"}, {"name": "tx_hash", "description": "On-chain transaction hash"}, {"name": "payment_url", "description": "Link to payment detail page"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb),

-- 5. Payment Failed
('payment_failed', 'Payment Failed', 'Payment failed: ${{amount}} {{currency}}',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <div style="text-align:center;padding:16px;background-color:#450a0a;border:1px solid #991b1b;border-radius:8px;margin-bottom:24px;">
    <p style="color:#f87171;font-size:13px;margin:0 0 4px;">Payment Failed</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 12px;">What happened</h2>
  <p style="color:#a1a1aa;font-size:14px;line-height:22px;margin:0 0 24px;">{{reason}}</p>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;">Order ID</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;">{{order_id}}</td>
  </tr>
  </table>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{payment_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">View Details</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Payment failed: ${{amount}} {{currency}}

Hi {{business_name}}, a payment has failed.

Reason: {{reason}}
Order ID: {{order_id}}

View details: {{payment_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "amount", "description": "Fiat amount"}, {"name": "currency", "description": "Fiat currency code"}, {"name": "order_id", "description": "Merchant order ID"}, {"name": "reason", "description": "Reason for failure"}, {"name": "payment_url", "description": "Link to payment detail page"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb),

-- 6. Ticket Reply
('ticket_reply', 'Ticket Reply', 'New reply on: {{ticket_subject}}',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#fafafa;font-size:20px;margin:0 0 8px;">New reply on your ticket</h1>
  <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">{{ticket_subject}}</p>
  <div style="padding:16px;border-left:3px solid #2563EB;background-color:#27272a;border-radius:0 8px 8px 0;margin-bottom:24px;">
    <p style="color:#d4d4d8;font-size:14px;line-height:22px;margin:0;">{{message_preview}}</p>
  </div>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="padding:4px 8px;background-color:#27272a;border-radius:4px;color:#a1a1aa;font-size:12px;">
      Status: <span style="color:#fafafa;">{{ticket_status}}</span>
    </td>
  </tr>
  </table>
  <table cellpadding="0" cellspacing="0">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{ticket_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">View Ticket</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'New reply on your ticket: {{ticket_subject}}

Hi {{business_name}}, there''s a new reply on your support ticket.

"{{message_preview}}"

Status: {{ticket_status}}

View ticket: {{ticket_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "ticket_subject", "description": "Support ticket subject"}, {"name": "message_preview", "description": "Preview of the reply message"}, {"name": "ticket_status", "description": "Current ticket status"}, {"name": "ticket_url", "description": "Link to ticket detail page"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb),

-- 7. Withdrawal Complete
('withdrawal_complete', 'Withdrawal Complete', 'Withdrawal complete: ${{amount}} {{currency}}',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <div style="text-align:center;padding:16px;background-color:#052e16;border:1px solid #166534;border-radius:8px;margin-bottom:24px;">
    <p style="color:#4ade80;font-size:13px;margin:0 0 4px;">Withdrawal Complete</p>
    <p style="color:#fafafa;font-size:28px;font-weight:bold;margin:0;">${{amount}} {{currency}}</p>
  </div>
  <h2 style="color:#fafafa;font-size:16px;margin:0 0 16px;">Withdrawal Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">Destination</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;word-break:break-all;">{{destination_address}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">Chain</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;">{{destination_chain}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">Token</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;">{{destination_token}}</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #27272a;"></td></tr>
  <tr>
    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;width:140px;vertical-align:top;">TX Hash</td>
    <td style="padding:8px 0;color:#fafafa;font-size:13px;vertical-align:top;word-break:break-all;">{{tx_hash}}</td>
  </tr>
  </table>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{wallet_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">View Wallet</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Withdrawal complete: ${{amount}} {{currency}}

Hi {{business_name}}, your withdrawal has been processed.

Destination: {{destination_address}}
Chain: {{destination_chain}}
Token: {{destination_token}}
TX Hash: {{tx_hash}}

View wallet: {{wallet_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "amount", "description": "Withdrawal amount"}, {"name": "currency", "description": "Currency code"}, {"name": "destination_address", "description": "Destination wallet address"}, {"name": "destination_chain", "description": "Blockchain name"}, {"name": "destination_token", "description": "Token symbol"}, {"name": "tx_hash", "description": "On-chain transaction hash"}, {"name": "wallet_url", "description": "Link to wallet/withdrawal page"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb),

-- 8. Weekly Summary
('weekly_summary', 'Weekly Summary', 'Your weekly summary — ${{total_revenue}} earned',
$$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <span style="font-size:24px;font-weight:bold;color:#2563EB;">go<span style="color:#7C3AED;">Blink</span> Merchant</span>
</td></tr>
<tr><td style="background-color:#18181b;border-radius:12px;padding:32px;border:1px solid #27272a;">
  <h1 style="color:#fafafa;font-size:20px;margin:0 0 24px;">Your weekly summary</h1>
  <div style="text-align:center;padding:20px;background-color:#27272a;border-radius:8px;margin-bottom:24px;">
    <p style="color:#a1a1aa;font-size:13px;margin:0 0 4px;">Total Revenue</p>
    <p style="color:#fafafa;font-size:32px;font-weight:bold;margin:0 0 8px;">${{total_revenue}}</p>
    <p style="color:{{trend_color}};font-size:13px;margin:0;">{{trend_direction}} {{trend_percent}}% vs last week</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:8px;">
      <div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Payments</p>
        <p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{payment_count}}</p>
      </div>
    </td>
    <td width="50%" style="padding:8px;">
      <div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Open Tickets</p>
        <p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{open_tickets}}</p>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding:8px;">
      <div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Top Token</p>
        <p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{top_token}}</p>
      </div>
    </td>
    <td width="50%" style="padding:8px;">
      <div style="padding:16px;background-color:#27272a;border-radius:8px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Top Chain</p>
        <p style="color:#fafafa;font-size:20px;font-weight:bold;margin:0;">{{top_chain}}</p>
      </div>
    </td>
  </tr>
  </table>
  <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="{{dashboard_url}}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">View Dashboard</a>
  </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;line-height:20px;">
  <p style="margin:0 0 8px;">&copy; 2026 goBlink &middot; <a href="https://goblink.io" style="color:#71717a;text-decoration:underline;">goblink.io</a></p>
  <p style="margin:0;">
    <a href="{{dashboard_url}}/settings#notifications" style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$$,
'Your weekly goBlink summary — ${{total_revenue}} earned

Hi {{business_name}}, here''s your weekly summary:

Total Revenue: ${{total_revenue}} ({{trend_direction}} {{trend_percent}}% vs last week)
Payments: {{payment_count}}
Open Tickets: {{open_tickets}}
Top Token: {{top_token}}
Top Chain: {{top_chain}}

View dashboard: {{dashboard_url}}

© 2026 goBlink · goblink.io',
'[{"name": "business_name", "description": "Merchant business name"}, {"name": "total_revenue", "description": "Total revenue this week"}, {"name": "payment_count", "description": "Number of payments this week"}, {"name": "top_token", "description": "Most used token"}, {"name": "top_chain", "description": "Most used blockchain"}, {"name": "trend_percent", "description": "Percentage change from last week"}, {"name": "trend_direction", "description": "Up or Down arrow"}, {"name": "trend_color", "description": "Color for trend indicator (#4ade80 for up, #f87171 for down)"}, {"name": "open_tickets", "description": "Number of open support tickets"}, {"name": "dashboard_url", "description": "Link to merchant dashboard"}]'::jsonb);
