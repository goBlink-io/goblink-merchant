import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex M.",
    role: "E-commerce Founder",
    quote:
      "Switched from Stripe to goBlink and cut my payment processing costs by 90%. Funds settle instantly.",
  },
  {
    name: "Sarah K.",
    role: "SaaS Developer",
    quote:
      "The API is incredibly clean. Had webhooks and payment links working in under an hour.",
  },
  {
    name: "David R.",
    role: "Freelance Designer",
    quote:
      "Non-custodial means I never worry about frozen funds. My crypto, my wallet, my rules.",
  },
];

export function SocialProof() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Trusted by Merchants Worldwide
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Join the growing community of businesses accepting crypto with goBlink.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
