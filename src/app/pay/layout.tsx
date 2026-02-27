import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay — goBlink",
  description: "Complete your crypto payment securely with goBlink.",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-center py-4 px-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="text-sm font-medium text-zinc-400">
            Powered by <span className="text-zinc-200">goBlink</span>
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-zinc-800/50">
        <div className="text-center text-xs text-zinc-500">
          Secured by goBlink &middot; Non-custodial payments
        </div>
      </footer>
    </div>
  );
}
