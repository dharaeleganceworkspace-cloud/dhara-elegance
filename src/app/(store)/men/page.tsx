import type { Metadata } from "next";
import { Listing, parseFilters } from "@/components/product/Listing";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Men's Jewellery — Rings, Chains, Kadas & Earrings",
  description: "Bold, anti-tarnish and waterproof men's jewellery for everyday wear.",
  alternates: { canonical: "/men" },
};

export default async function MenPage({ searchParams }: PageProps<"/men">) {
  const filters = parseFilters(await searchParams, "men");
  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      <section className="relative overflow-hidden border-b border-gold/20">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(212,175,55,0.07)_0_1px,transparent_1px_32px)]" />
        <div className="pointer-events-none absolute -top-16 right-[10%] h-64 w-64 rotate-45 border border-gold/25" />
        <Reveal className="container-lux relative py-20 sm:py-28">
          <p className="eyebrow">For Him</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight uppercase sm:text-7xl">
            Men<span className="text-gold">.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-cream/70">Strong geometry, metallic finishes. Built for every day.</p>
        </Reveal>
      </section>
      <div className="pt-10">
        <Listing basePath="/men" filters={filters} fixedGender="men" dark />
      </div>
    </div>
  );
}
