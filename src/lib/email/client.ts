import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = "goBlink Merchant <noreply@goblink.io>";

// Resend free tier: 3,000 emails/month. Monitor usage at resend.com/overview.

interface SendEmailReactOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

interface SendEmailHtmlOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type SendEmailOptions = SendEmailReactOptions | SendEmailHtmlOptions;

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send:", options.subject);
    return { success: false };
  }

  try {
    let result;

    if ("react" in options) {
      result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: options.to,
        subject: options.subject,
        react: options.react,
      });
    } else {
      result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    }

    if (result.error) {
      console.error("[email] Failed to send:", result.error);
      return { success: false };
    }

    console.log("[email] Sent:", options.subject, "→", options.to, "id:", result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] Resend error:", err);
    return { success: false };
  }
}
