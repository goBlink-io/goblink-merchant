import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "SDK Docs", href: "https://docs.goblink.io/merchant-sdk", external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.goblink.io", external: true },
      { label: "goBlink Swap", href: "https://goblink.io", external: true },
      { label: "Support", href: "mailto:support@goblink.io" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "X / Twitter", href: "https://x.com/goBlink_io", external: true },
      { label: "Discord", href: "https://discord.gg/goblink", external: true },
      { label: "GitHub", href: "https://github.com/Urban-Blazer", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-500 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-500 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-8 md:flex-row">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-semibold text-white">goBlink Merchant</span>
          </div>
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} goBlink. Non-custodial &middot; We never touch your funds.
          </p>
        </div>
      </div>
    </footer>
  );
}
