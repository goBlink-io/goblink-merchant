import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, currency, timezone, onboarding_completed")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    redirect("/login");
  }

  return (
    <OnboardingWizard
      merchantId={merchant.id}
      businessName={merchant.business_name}
      currentCurrency={merchant.currency}
      currentTimezone={merchant.timezone}
      alreadyCompleted={merchant.onboarding_completed}
    />
  );
}
