import { createClient } from "@/lib/supabase/server";
import { ChatWidget } from "./chat-widget";

export async function ChatWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessName: string | undefined;

  if (user) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("business_name")
      .eq("user_id", user.id)
      .single();

    businessName = merchant?.business_name ?? undefined;
  }

  return <ChatWidget businessName={businessName} />;
}
