import { Hero } from "@/components/home/Hero";
import { Newsletter } from "@/components/home/Newsletter";
import { BrandStory, Faq, FeaturedCollections, ImageGallery, Instagram, ProductRail, Reviews, ShopGender, Usps, WhyDhara, FAQS } from "@/components/home/Sections";
import { getCategories, getReviews, getSettings, listFlagged } from "@/lib/catalog";
import type { ProductWithRelations } from "@/lib/types";

export default async function HomePage() {
  const [categories, bestSellers, newArrivals, trending, featured, reviews, settings] = await Promise.all([
    getCategories(),
    listFlagged("is_bestseller"),
    listFlagged("is_new"),
    listFlagged("trending", 4),
    listFlagged("is_featured", 12),
    getReviews(undefined, 6),
    getSettings(),
  ]);

  const imagesOf = (list: ProductWithRelations[]) =>
    list.flatMap((p) => p.images.map((img) => ({ url: img.url, alt: img.alt_text ?? p.name, href: `/product/${p.slug}` })));
  const pool = [...imagesOf(featured), ...imagesOf(bestSellers), ...imagesOf(newArrivals)];
  const unique = [...new Map(pool.map((i) => [i.url, i])).values()];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <Hero />
      <Usps />
      <ShopGender men={categories.filter((c) => c.gender === "men")} women={categories.filter((c) => c.gender === "women")} />
      <ProductRail eyebrow="Most Loved" title="Best Sellers" products={bestSellers} href="/search?sort=best" />
      <ProductRail eyebrow="Just Arrived" title={<>New <em>Arrivals</em></>} products={newArrivals} href="/search?sort=newest" dark />
      <ProductRail eyebrow="Right Now" title="Trending" products={trending} href="/search?sort=best" />
      <FeaturedCollections categories={categories} />
      <ImageGallery eyebrow="Editorial" title="The art of everyday shine" images={unique} variant="editorial" />
      <WhyDhara />
      <BrandStory />
      <ImageGallery eyebrow="Lifestyle" title="Worn, not saved" images={unique.slice(5)} variant="lifestyle" />
      <Reviews reviews={reviews} />
      <Instagram handle={settings?.instagram_handle ?? null} images={unique} />
      <Faq />
      <section className="bg-navy py-20 text-center text-cream">
        <div className="container-lux flex flex-col items-center">
          <p className="eyebrow">Newsletter</p>
          <h2 className="heading-lux mt-3 mb-8 text-4xl sm:text-5xl">Be the first to shine</h2>
          <Newsletter dark />
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </>
  );
}
