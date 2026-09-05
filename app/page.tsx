import CTA from "@/components/CTA";
import Features from "@/components/Features";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    // Navbar and Footer come from the root layout.
    <main className="flex-1">
      <Hero />

      <Features />

      <CTA />
    </main>
  );
}
