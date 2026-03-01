import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ChatWrapper } from "@/components/chatbot/chat-wrapper";
import { TestModeProvider } from "@/contexts/TestModeContext";
import { TestModeBar } from "@/components/dashboard/test-mode-bar";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Toaster } from "sonner";
import { IdleTimeoutWrapper } from "@/components/dashboard/idle-timeout-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (merchant && !merchant.onboarding_completed) {
      redirect("/dashboard/onboarding");
    }
  }

  return (
    <TestModeProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:pl-64 transition-all duration-300">
          {/* Test mode top bar indicator */}
          <TestModeBar />
          {/* Notification bell — top right */}
          <div className="fixed top-4 right-4 z-40 lg:right-8">
            <NotificationBell />
          </div>
          <div className="p-4 pt-20 lg:pt-8 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <Suspense fallback={null}>
          <ChatWrapper />
        </Suspense>
      </div>
      <IdleTimeoutWrapper />
      <Toaster theme="dark" richColors position="top-right" />
    </TestModeProvider>
  );
}
