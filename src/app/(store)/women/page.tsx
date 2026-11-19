import type { Metadata } from "next";
import { Listing, parseFilters } from "@/components/product/Listing";
import { CurtainReveal, Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Women's Jewellery — Chains, Pendants, Rings, Earrings, Kadas & Bracelets",
  description: "Elegant, anti-tarnish and waterproof women's jewellery made to shine every day.",
  alternates: { canonical: "/women" },
};

export default async function WomenPage({ searchParams }: PageProps<"/women">) {
  const filters = parseFilters(await searchParams, "women");
  return (
    <div className="min-h-screen bg-cream">
      <section className="relative overflow-hidden">
        <CurtainReveal className="absolute inset-0 bg-[linear-gradient(120deg,#f3ede1_0%,#faf8f4_45%,#efe2bf_100%)]">
          <div className="absolute -right-20 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35),transparent_65%)]" />
        </CurtainReveal>
        <Reveal className="container-lux relative py-20 text-center sm:py-32">
          <p className="eyebrow">For Her</p>
          <h1 className="heading-lux mt-4 text-6xl text-navy italic sm:text-8xl">Women</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink/70">Soft light, fine lines and lasting shine. Pieces made to be lived in.</p>
        </Reveal>
      </section>
      <div className="pt-10">
        <Listing basePath="/women" filters={filters} fixedGender="women" />
      </div>
    </div>
  );
}
