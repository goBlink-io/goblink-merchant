import { getServiceClient } from "@/lib/service-client";
import { sendEmail } from "./client";
import { getTemplate, renderTemplate, htmlEncode } from "./sender";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://merchant.goblink.io";

/**
 * Fallback verification email HTML when DB template is unavailable.
 */
function fallbackVerificationHtml(businessName: string, verificationUrl: string): string {
  const safeName = htmlEncode(businessName);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
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
    Hi ${safeName}, please verify your email address to get started with goBlink Merchant.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="${verificationUrl}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Verify Email</a>
  </td></tr>
  </table>
  <p style="color:#52525b;font-size:12px;margin:0;">If you didn't create this account, ignore this email.</p>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;">
  <p style="margin:0;">&copy; 2026 goBlink &middot; goblink.io</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Fallback password reset email HTML when DB template is unavailable.
 */
function fallbackPasswordResetHtml(businessName: string, resetUrl: string): string {
  const safeName = htmlEncode(businessName);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
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
    Hi ${safeName}, click below to reset your password.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td align="center" style="background-color:#2563EB;border-radius:8px;padding:12px 24px;">
    <a href="${resetUrl}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Reset Password</a>
  </td></tr>
  </table>
  <p style="color:#52525b;font-size:12px;margin:0;">This link expires in 1 hour.</p>
</td></tr>
<tr><td align="center" style="padding-top:32px;color:#52525b;font-size:12px;">
  <p style="margin:0;">&copy; 2026 goBlink &middot; goblink.io</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Send a branded verification email via Resend.
 * Uses DB template if available, falls back to hardcoded HTML.
 */
export async function sendVerificationEmail(
  email: string,
  businessName: string,
  verificationUrl: string
): Promise<void> {
  const variables = {
    business_name: businessName,
    verification_url: verificationUrl,
  };

  const dbTemplate = await getTemplate("verification");

  if (dbTemplate) {
    const subject = renderTemplate(dbTemplate.subject, variables);
    const html = renderTemplate(dbTemplate.body_html, variables);
    const text = renderTemplate(dbTemplate.body_text, variables);

    await sendEmail({ to: email, subject, html, text });
  } else {
    await sendEmail({
      to: email,
      subject: "Verify your email — goBlink Merchant",
      html: fallbackVerificationHtml(businessName, verificationUrl),
      text: `Hi ${businessName}, please verify your email: ${verificationUrl}`,
    });
  }
}

/**
 * Send a branded password reset email via Resend.
 * Uses Supabase admin API to generate a magic link, then sends our branded email.
 */
export async function sendPasswordResetEmail(
  email: string,
  businessName: string,
  resetUrl: string
): Promise<void> {
  const variables = {
    business_name: businessName,
    reset_url: resetUrl,
  };

  const dbTemplate = await getTemplate("password_reset");

  if (dbTemplate) {
    const subject = renderTemplate(dbTemplate.subject, variables);
    const html = renderTemplate(dbTemplate.body_html, variables);
    const text = renderTemplate(dbTemplate.body_text, variables);

    await sendEmail({ to: email, subject, html, text });
  } else {
    await sendEmail({
      to: email,
      subject: "Reset your password — goBlink Merchant",
      html: fallbackPasswordResetHtml(businessName, resetUrl),
      text: `Hi ${businessName}, reset your password: ${resetUrl}`,
    });
  }
}

/**
 * Generate a verification link using Supabase admin API.
 * Returns the generated URL or null on failure.
 */
export async function generateVerificationLink(email: string): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${APP_URL}/auth/callback`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[email] Failed to generate verification link:", error);
      return null;
    }

    return data.properties.action_link;
  } catch (err) {
    console.error("[email] generateVerificationLink error:", err);
    return null;
  }
}

/**
 * Generate a password reset link using Supabase admin API.
 * Returns the generated URL or null on failure.
 */
export async function generatePasswordResetLink(email: string): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${APP_URL}/auth/callback?next=/dashboard/settings`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[email] Failed to generate reset link:", error);
      return null;
    }

    return data.properties.action_link;
  } catch (err) {
    console.error("[email] generatePasswordResetLink error:", err);
    return null;
  }
}
