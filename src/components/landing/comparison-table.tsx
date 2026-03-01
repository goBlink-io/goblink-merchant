import { Check, X, Minus } from "lucide-react";

interface Row {
  provider: string;
  directToWallet: boolean | null;
  fees: string;
  settlement: string;
  chains: string;
  chargebacks: boolean;
  highlight?: boolean;
}

const rows: Row[] = [
  {
    provider: "goBlink",
    directToWallet: true,
    fees: "0.05 – 0.35%",
    settlement: "Instant",
    chains: "12",
    chargebacks: false,
    highlight: true,
  },
  {
    provider: "Stripe",
    directToWallet: false,
    fees: "2.9% + $0.30",
    settlement: "2–7 days",
    chains: "—",
    chargebacks: true,
  },
  {
    provider: "BitPay",
    directToWallet: false,
    fees: "1%",
    settlement: "1–2 days",
    chains: "16",
    chargebacks: false,
  },
  {
    provider: "Coinbase Commerce",
    directToWallet: false,
    fees: "1%",
    settlement: "1–2 days",
    chains: "8",
    chargebacks: false,
  },
  {
    provider: "NOWPayments",
    directToWallet: false,
    fees: "0.5 – 1%",
    settlement: "Minutes",
    chains: "200+",
    chargebacks: false,
  },
];

function BoolCell({ value, inverted }: { value: boolean | null; inverted?: boolean }) {
  if (value === null) return <Minus className="h-4 w-4 text-zinc-600" />;
  const isGood = inverted ? !value : value;
  return isGood ? (
    <Check className="h-4 w-4 text-emerald-400" />
  ) : (
    <X className="h-4 w-4 text-red-400" />
  );
}

export function ComparisonTable() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            See How We Compare
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Lower fees. Faster settlement. No custody risk.
          </p>
        </div>

        <div className="max-w-5xl mx-auto overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left py-4 px-6 text-zinc-400 font-medium">Provider</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Direct to Wallet</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Fees</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Settlement</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Chains</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">No Chargebacks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.provider}
                  className={
                    row.highlight
                      ? "bg-blue-600/10 border-b border-blue-500/20"
                      : "border-b border-zinc-800/50 last:border-b-0"
                  }
                >
                  <td className="py-4 px-6">
                    <span
                      className={
                        row.highlight ? "font-semibold text-white" : "text-zinc-300"
                      }
                    >
                      {row.provider}
                    </span>
                    {row.highlight && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex justify-center">
                      <BoolCell value={row.directToWallet} />
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={
                        row.highlight ? "font-medium text-emerald-400" : "text-zinc-300"
                      }
                    >
                      {row.fees}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={
                        row.highlight ? "font-medium text-emerald-400" : "text-zinc-300"
                      }
                    >
                      {row.settlement}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={
                        row.highlight ? "font-medium text-white" : "text-zinc-300"
                      }
                    >
                      {row.chains}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex justify-center">
                      <BoolCell value={row.chargebacks} inverted />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
