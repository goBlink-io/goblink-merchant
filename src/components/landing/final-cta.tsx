import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 px-8 py-16 sm:px-16 sm:py-24 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[100px]" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Start accepting crypto in 5 minutes
          </h2>
          <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
            No setup fees. No monthly costs. Just connect your wallet and start getting
            paid.
          </p>

          <div className="mt-10">
            <Button size="lg" asChild className="text-base px-10">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
