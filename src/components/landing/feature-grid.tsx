import { Shield, Globe, Zap, Palette, Bell, Code } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Non-Custodial",
    description:
      "Your keys, your crypto. Payments settle directly to your wallet. We never hold your funds.",
  },
  {
    icon: Globe,
    title: "Multi-Chain Support",
    description:
      "Accept payments on Ethereum, Solana, Base, Polygon, Arbitrum, and more chains.",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description:
      "No waiting days for funds. Payments arrive in your wallet as soon as the transaction confirms.",
  },
  {
    icon: Palette,
    title: "Instant Checkout",
    description:
      "Simple, fast payment flow for your customers. Generate a payment, share the link, get paid.",
  },
  {
    icon: Bell,
    title: "Webhook Alerts",
    description:
      "Real-time webhook notifications with HMAC-SHA256 signing and automatic retries. Never miss a payment.",
  },
  {
    icon: Code,
    title: "Webhooks & API",
    description:
      "Real-time webhook notifications and a full REST API. Integrate goBlink into any workflow.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Everything You Need
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Built for merchants who want control, speed, and simplicity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 mb-4 transition-colors group-hover:from-blue-600/30 group-hover:to-violet-600/30">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
