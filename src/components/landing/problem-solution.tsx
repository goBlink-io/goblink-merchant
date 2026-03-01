import { X, Check } from "lucide-react";

const oldWay = [
  "Funds held for 7–14 days",
  "3% + $0.30 per transaction",
  "Account freezes without warning",
  "Chargebacks eat your revenue",
  "Limited to fiat currencies",
];

const newWay = [
  "Funds settle instantly to your wallet",
  "Fees as low as 0.05%",
  "Non-custodial — can't freeze what we don't hold",
  "No chargebacks — crypto is final",
  "Accept any token on 26+ chains",
];

export function ProblemSolution() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Traditional processors hold your money for days,{" "}
            <span className="text-zinc-500">charge 3%, and freeze accounts.</span>
          </h2>
          <p className="mt-4 text-lg text-zinc-400">We don&apos;t.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Old Way */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8">
            <h3 className="text-lg font-semibold text-red-400 mb-6">The Old Way</h3>
            <ul className="space-y-4">
              {oldWay.map((item) => (
                <li key={item} className="flex items-start gap-3 text-zinc-400">
                  <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* goBlink Way */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8">
            <h3 className="text-lg font-semibold text-emerald-400 mb-6">The goBlink Way</h3>
            <ul className="space-y-4">
              {newWay.map((item) => (
                <li key={item} className="flex items-start gap-3 text-zinc-300">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
