import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/service-client";
import { sendWelcomeEmail } from "@/lib/email/triggers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const safeNext = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Send welcome email for new users (created within the last 60 seconds)
      const createdAt = new Date(data.user.created_at).getTime();
      const now = Date.now();
      if (now - createdAt < 60_000) {
        const serviceClient = getServiceClient();
        const { data: merchant } = await serviceClient
          .from("merchants")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (merchant) {
          // Fire and forget — don't block redirect
          sendWelcomeEmail(merchant.id).catch((err) =>
            console.error("[email] Welcome email failed:", err)
          );

          // Link referral if referral_code was passed during signup
          const refCode = data.user.user_metadata?.referral_code;
          if (refCode) {
            const { data: referrer } = await serviceClient
              .from("merchants")
              .select("id")
              .eq("referral_code", refCode)
              .single();

            if (referrer && referrer.id !== merchant.id) {
              await serviceClient
                .from("merchant_referrals")
                .insert({
                  referrer_id: referrer.id,
                  referred_id: merchant.id,
                  status: "pending",
                })
                .then(({ error: refErr }) => {
                  if (refErr) console.error("[referral] Failed to create referral link:", refErr.message);
                });
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
