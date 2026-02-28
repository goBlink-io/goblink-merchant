import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = "goBlink Merchant <noreply@goblink.io>";

// Resend free tier: 3,000 emails/month. Monitor usage at resend.com/overview.

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send:", subject);
    return { success: false };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("[email] Failed to send:", error);
      return { success: false };
    }

    console.log("[email] Sent:", subject, "→", to, "id:", data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[email] Resend error:", err);
    return { success: false };
  }
}
