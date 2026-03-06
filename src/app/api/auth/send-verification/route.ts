import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import {
  sendVerificationEmail,
  generateVerificationLink,
} from "@/lib/email/auth-emails";

/**
 * POST /api/auth/send-verification
 * Send a branded verification email after signup.
 * Body: { email: string, businessName: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, businessName } = body;

    if (!email || !businessName) {
      return NextResponse.json(
        { error: "email and businessName are required" },
        { status: 400 }
      );
    }

    // Verify the user exists and is not yet confirmed
    const supabase = getServiceClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);

    if (!user) {
      // Don't reveal whether user exists
      return NextResponse.json({ success: true });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ success: true });
    }

    // Generate verification link
    const verificationUrl = await generateVerificationLink(email);
    if (!verificationUrl) {
      console.error("[auth] Failed to generate verification link for:", email);
      return NextResponse.json({ success: true });
    }

    await sendVerificationEmail(email, businessName, verificationUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth] send-verification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
