import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { ComparisonTable } from "@/components/landing/comparison-table";
// import { Pricing } from "@/components/landing/pricing"; // Removed — subscription model TBD post-sprints
import { TrustSignals } from "@/components/landing/trust-signals";
// import { SocialProof } from "@/components/landing/social-proof"; // Hidden until real testimonials
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "goBlink Merchant — Non-Custodial Crypto Payment Processing",
  description:
    "Accept crypto payments directly to your wallet. Non-custodial, instant settlement, 12 chains. Start in 5 minutes.",
  openGraph: {
    title: "goBlink Merchant — Non-Custodial Crypto Payment Processing",
    description:
      "Accept crypto payments directly to your wallet. Non-custodial, instant settlement, 12 chains.",
    type: "website",
    url: "https://merchant.goblink.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "goBlink Merchant — Non-Custodial Crypto Payment Processing",
    description:
      "Accept crypto payments directly to your wallet. Non-custodial, instant settlement, 12 chains.",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <HowItWorks />
      <FeatureGrid />
      <ComparisonTable />
      <TrustSignals />
      <FinalCTA />
      <Footer />
    </main>
  );
}
