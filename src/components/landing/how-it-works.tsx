import { UserPlus, Link2, Wallet } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Account",
    description:
      "Sign up in under a minute. Connect your wallet address — that's where your payments go.",
  },
  {
    number: "02",
    icon: Link2,
    title: "Share Payment Link",
    description:
      "Create a payment via API, link, or invoice. Send it to your customer.",
  },
  {
    number: "03",
    icon: Wallet,
    title: "Get Paid Instantly",
    description:
      "Customer pays in any token. Funds settle directly to your wallet — no middleman.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
          <p className="mt-4 text-lg text-zinc-400">
            Three steps. Five minutes. Start getting paid.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-blue-600/50 via-violet-600/50 to-blue-600/50" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              <div className="text-xs font-mono font-bold text-violet-400 mb-4 tracking-widest">
                STEP {step.number}
              </div>
              <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 mb-6">
                <step.icon className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
