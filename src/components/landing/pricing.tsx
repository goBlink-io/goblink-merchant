import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    rate: "0.35%",
    volume: "< $10K / mo",
    features: [
      "No monthly fee",
      "No setup fee",
      "26+ chains supported",
      "API + webhooks",
      "Email support",
    ],
  },
  {
    name: "Growth",
    rate: "0.10%",
    volume: "$10K – $100K / mo",
    popular: true,
    features: [
      "Everything in Starter",
      "Priority support",
      "Custom checkout branding",
      "Advanced analytics",
      "Dedicated account manager",
    ],
  },
  {
    name: "Enterprise",
    rate: "0.05%",
    volume: "> $100K / mo",
    features: [
      "Everything in Growth",
      "Volume discounts",
      "SLA guarantee",
      "Custom integrations",
      "White-label options",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            No monthly fees. No setup fees. No hidden costs. Just a small percentage per
            transaction.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border p-8 flex flex-col ${
                tier.popular
                  ? "border-blue-500/50 bg-blue-600/5 shadow-lg shadow-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-semibold text-white">{tier.name}</h3>

              <div className="mt-4">
                <span className="text-4xl font-bold text-white">{tier.rate}</span>
                <span className="text-zinc-400 ml-1">per tx</span>
              </div>
              <p className="text-sm text-zinc-500 mt-2">{tier.volume}</p>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={tier.popular ? "default" : "outline"}
                className="mt-8 w-full"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
