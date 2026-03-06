import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import {
  sendPasswordResetEmail,
  generatePasswordResetLink,
} from "@/lib/email/auth-emails";

/**
 * POST /api/auth/send-reset
 * Send a branded password reset email.
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    // Look up user and merchant info
    const supabase = getServiceClient();
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);

    if (!user) {
      // Don't reveal whether user exists — return success either way
      return NextResponse.json({ success: true });
    }

    // Get business name from merchant record
    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_name")
      .eq("user_id", user.id)
      .single();

    const businessName = merchant?.business_name || "there";

    // Generate reset link via Supabase admin API
    const resetUrl = await generatePasswordResetLink(email);
    if (!resetUrl) {
      console.error("[auth] Failed to generate reset link for:", email);
      return NextResponse.json({ success: true });
    }

    await sendPasswordResetEmail(email, businessName, resetUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth] send-reset error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
