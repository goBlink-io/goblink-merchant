import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "API Docs", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Twitter", href: "#" },
      { label: "Discord", href: "#" },
      { label: "GitHub", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-white">goBlink</span>
                <span className="text-xs text-zinc-500">Merchant</span>
              </div>
            </Link>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Non-custodial crypto payment processing for modern merchants.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} goBlink. All rights reserved.
          </p>
          {/* TODO: Deploy status.goblink.io via Upptime (GitHub-based) */}
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">System Status</a>
            <p className="text-xs text-zinc-600">Built by goBlink</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
