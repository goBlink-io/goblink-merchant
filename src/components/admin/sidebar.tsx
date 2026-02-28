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
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Server,
  LogOut,
  Zap,
  ChevronLeft,
  Menu,
  Shield,
  Ticket,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { title: "Overview", href: "/admin", icon: LayoutDashboard },
  { title: "Merchants", href: "/admin/merchants", icon: Users },
  { title: "Payments", href: "/admin/payments", icon: CreditCard },
  { title: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Tickets", href: "/admin/tickets", icon: Ticket },
  { title: "Templates", href: "/admin/templates", icon: Mail },
  { title: "Issues", href: "/admin/issues", icon: AlertTriangle },
  { title: "System", href: "/admin/system", icon: Server },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openTicketCount, setOpenTicketCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.stats) {
          setOpenTicketCount(
            (data.stats.open ?? 0) + (data.stats.in_progress ?? 0) + (data.stats.waiting_on_merchant ?? 0)
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
          {/* Logo + Admin badge */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">goBlink</span>
                  <Badge className="bg-violet-600/20 text-violet-400 border-violet-500/30 text-[10px] px-1.5 py-0">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    Admin
                  </Badge>
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
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-violet-600/10 text-violet-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        {item.title}
                        {item.title === "Tickets" && openTicketCount > 0 && (
                          <Badge className="bg-violet-600/20 text-violet-400 border-violet-500/30 text-[10px] px-1.5 py-0 ml-auto">
                            {openTicketCount}
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

          {/* Back to merchant + sign out */}
          <div className="p-2 space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-zinc-500 hover:text-white text-xs",
                collapsed && "justify-center px-0"
              )}
              onClick={() => router.push("/dashboard")}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2">Merchant Dashboard</span>}
            </Button>
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
