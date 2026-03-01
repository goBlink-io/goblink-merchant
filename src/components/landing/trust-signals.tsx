import { Shield, Lock, FlaskConical, Key } from "lucide-react";

const signals = [
  {
    icon: Shield,
    title: "Non-Custodial",
    description:
      "We never hold, manage, or have access to your funds. Payments go directly to your wallet.",
  },
  {
    icon: Lock,
    title: "Webhook Signatures",
    description:
      "Every webhook delivery is signed with HMAC-SHA256 so you can verify it came from goBlink.",
  },
  {
    icon: Key,
    title: "API Key Management",
    description:
      "Separate live and test keys. Rotate anytime. Keys are bcrypt-hashed at rest.",
  },
  {
    icon: FlaskConical,
    title: "Test Mode",
    description:
      "Full sandbox environment with test keys. Build and test without touching real funds.",
  },
];

const chains = [
  "Ethereum",
  "Solana",
  "Base",
  "Polygon",
  "Arbitrum",
  "Optimism",
  "BSC",
  "Avalanche",
];

export function TrustSignals() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6">
            <Shield className="h-4 w-4" />
            Non-custodial &middot; We never touch your funds
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for Trust</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Security isn&apos;t an afterthought. It&apos;s the foundation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {signals.map((signal) => (
            <div key={signal.title} className="text-center p-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <signal.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{signal.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {signal.description}
              </p>
            </div>
          ))}
        </div>

        {/* Chain logos placeholder */}
        <div className="mt-16 text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-6">
            Supported Chains
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {chains.map((chain) => (
              <div
                key={chain}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs text-zinc-500"
              >
                {chain}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
