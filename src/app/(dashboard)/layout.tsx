import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ChatWrapper } from "@/components/chatbot/chat-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64 transition-all duration-300">
        <div className="p-4 pt-20 lg:pt-8 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <Suspense fallback={null}>
        <ChatWrapper />
      </Suspense>
    </div>
  );
}
