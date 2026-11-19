import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/product/Gallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ProductGrid } from "@/components/product/ProductCard";
import { ReviewForm } from "@/components/product/ReviewForm";
import { Reveal } from "@/components/motion/Reveal";
import { Stars } from "@/components/home/Sections";
import { getProductBySlug, getRelated, getReviews } from "@/lib/catalog";
import { siteUrl } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const description = product.seo_description ?? product.short_description ?? product.description?.slice(0, 160) ?? undefined;
  return {
    title: product.seo_title ?? product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description, images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt_text ?? product.name })) },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, reviews] = await Promise.all([getRelated(product), getReviews(product.id)]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const genderPath = `/${product.gender}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "Dhara Elegance" },
    category: product.category?.name,
    material: product.material ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/product/${product.slug}`,
    },
    ...(reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length } } : {}),
  };

  const specs: [string, string | null][] = [
    ["Category", product.category?.name ?? null],
    ["Collection", product.gender === "men" ? "Men" : "Women"],
    ["Material", product.material],
    ["Metal", product.metal],
    ["Finish", product.finish],
    ["Colour", product.color],
    ["SKU", product.sku],
  ];

  return (
    <div className="pb-24">
      <nav className="container-lux py-6 text-xs tracking-wider text-ink/50" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-gold">Home</Link> /{" "}
        <Link href={genderPath} className="capitalize hover:text-gold">{product.gender}</Link> /{" "}
        {product.category && <><Link href={`${genderPath}?category=${product.category.slug}`} className="hover:text-gold">{product.category.name}</Link> / </>}
        <span className="text-navy">{product.name}</span>
      </nav>

      <div className="container-lux grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Gallery images={product.images} name={product.name} />
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{product.category?.name} · {product.gender === "men" ? "Men" : "Women"}</p>
          <h1 className="heading-lux mt-3 text-4xl text-navy sm:text-5xl">{product.name}</h1>
          {reviews.length > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-ink/60"><Stars rating={Math.round(avg)} /> {avg.toFixed(1)} ({reviews.length})</a>
          )}
          {product.short_description && <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.short_description}</p>}
          <div className="mt-8">
            <PurchasePanel product={product} />
          </div>
          <div className="mt-10 divide-y divide-navy/10 border-y border-navy/10 text-sm">
            <Accordion title="Description" open>
              <p className="whitespace-pre-line leading-relaxed text-ink/70">{product.description ?? product.short_description ?? "—"}</p>
            </Accordion>
            <Accordion title="Details">
              <dl className="grid grid-cols-2 gap-y-2">
                {specs.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>
            <Accordion title="Care Instructions">
              <ul className="list-disc space-y-1 pl-5 text-ink/70">
                <li>Anti-tarnish, waterproof and sweat-proof — made for daily wear.</li>
                <li>Rinse with fresh water after the pool or sea and pat dry with a soft cloth.</li>
                <li>Avoid harsh chemicals and abrasive cleaners.</li>
                <li>Store separately in the Dhara Elegance pouch to avoid scratches.</li>
              </ul>
            </Accordion>
            <Accordion title="Shipping & Ordering">
              <p className="leading-relaxed text-ink/70">Place your order on the website and continue on WhatsApp. Our team confirms availability, delivery timeline and payment with you directly. Shipping charges, if any, are shown at checkout.</p>
            </Accordion>
          </div>
        </div>
      </div>

      <section id="reviews" className="container-lux mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Customer Reviews</p>
          <h2 className="heading-lux mt-3 text-4xl text-navy">{reviews.length ? `${avg.toFixed(1)} out of 5` : "No reviews yet"}</h2>
          <div className="mt-8"><ReviewForm productId={product.id} slug={product.slug} /></div>
        </div>
        <div className="space-y-6">
          {reviews.map((r) => (
            <Reveal key={r.id} y={16} className="border-b border-navy/10 pb-6">
              <Stars rating={r.rating} />
              {r.title && <h3 className="mt-2 font-display text-xl text-navy">{r.title}</h3>}
              {r.body && <p className="mt-2 text-sm leading-relaxed text-ink/70">{r.body}</p>}
              <p className="mt-3 text-xs text-ink/50">{r.author_name}{r.is_verified && <span className="ml-2 font-semibold text-gold">✓ Verified purchase</span>}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-lux mt-24">
          <p className="eyebrow">You may also like</p>
          <h2 className="heading-lux mt-3 mb-10 text-4xl text-navy">Related pieces</h2>
          <ProductGrid products={related} />
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.2em] text-navy uppercase">
        {title}
        <span className="text-gold transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
