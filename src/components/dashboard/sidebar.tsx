"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  CreditCard,
  Link2,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  Menu,
  LifeBuoy,
  FlaskConical,
  Plug,
  FileText,
  Store,
  Activity,
  Download,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useTestModeContext } from "@/contexts/TestModeContext";
import { useState, useEffect } from "react";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Payments",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "Refunds",
    href: "/dashboard/refunds",
    icon: RotateCcw,
  },
  {
    title: "Payment Links",
    href: "/dashboard/links",
    icon: Link2,
  },
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    title: "POS",
    href: "/dashboard/pos",
    icon: Store,
  },
  {
    title: "Support",
    href: "/dashboard/support",
    icon: LifeBuoy,
  },
  {
    title: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Plug,
  },
  {
    title: "Activity",
    href: "/dashboard/activity",
    icon: Activity,
  },
  {
    title: "Export",
    href: "/dashboard/export",
    icon: Download,
  },
  {
    title: "Settlement",
    href: "/dashboard/settings/settlement",
    icon: Wallet,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const { isTestMode, toggleTestMode } = useTestModeContext();

  useEffect(() => {
    fetch("/api/v1/internal/tickets")
      .then((res) => res.ok ? res.json() : null)
      .then((tickets) => {
        if (Array.isArray(tickets)) {
          setUnresolvedCount(
            tickets.filter((t: { status: string }) =>
              ["open", "in_progress", "waiting_on_merchant"].includes(t.status)
            ).length
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-white">goBlink</span>
                  <span className="text-xs text-zinc-500">Merchant</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </button>
          </div>

          <Separator />

          {/* Nav */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/10 text-blue-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        {item.title}
                        {item.title === "Support" && unresolvedCount > 0 && (
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0 ml-auto">
                            {unresolvedCount}
                          </Badge>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          <Separator />

          {/* Test/Live toggle */}
          <div className="px-3 py-3">
            <button
              onClick={toggleTestMode}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isTestMode
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <FlaskConical className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="flex-1 flex items-center justify-between">
                  {isTestMode ? "Test Mode" : "Live Mode"}
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      isTestMode ? "bg-amber-500" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                        isTestMode ? "translate-x-4" : "translate-x-1"
                      )}
                    />
                  </span>
                </span>
              )}
            </button>
          </div>

          <Separator />

          {/* Sign out */}
          <div className="p-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-zinc-400 hover:text-white",
                collapsed && "justify-center px-0"
              )}
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="ml-3">Sign out</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
