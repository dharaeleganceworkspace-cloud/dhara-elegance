import type { Metadata } from "next";
import { BrandStory, Usps, WhyDhara } from "@/components/home/Sections";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Dhara Elegance makes anti-tarnish, waterproof, sweat-proof jewellery that lives with you.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy py-24 text-center text-cream sm:py-32">
        <Reveal className="container-lux">
          <p className="eyebrow">Our Story</p>
          <h1 className="heading-lux mx-auto mt-4 max-w-3xl text-5xl sm:text-7xl">Jewellery that <span className="gold-text italic">lives with you.</span></h1>
        </Reveal>
      </section>
      <BrandStory />
      <Usps />
      <WhyDhara />
    </>
  );
}
