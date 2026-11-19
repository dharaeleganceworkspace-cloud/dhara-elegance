import Image from "next/image";
import Link from "next/link";
import { CurtainReveal, Parallax, Reveal } from "@/components/motion/Reveal";
import { ProductGrid } from "@/components/product/ProductCard";
import { LogoMark } from "@/components/Logo";
import type { Category, ProductWithRelations, Review } from "@/lib/types";

export const USPS = [
  { title: "Anti-Tarnish", text: "Colour that stays true, wear after wear." },
  { title: "Waterproof", text: "Shower, swim, repeat — no need to take it off." },
  { title: "Sweat-Proof", text: "Gym, commute, summer days. Still shining." },
  { title: "Skin-Friendly", text: "Gentle on skin, designed for all-day comfort." },
  { title: "Everyday Wear", text: "Made to live with you from morning to night." },
  { title: "Premium Look", text: "Fine-jewellery finish without the fuss." },
];

export function SectionHeading({ eyebrow, title, href, linkLabel = "View all", light = false }: { eyebrow: string; title: React.ReactNode; href?: string; linkLabel?: string; light?: boolean }) {
  return (
    <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:mb-14 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 className={`heading-lux text-4xl sm:text-5xl ${light ? "text-cream" : "text-navy"}`}>{title}</h2>
      </div>
      {href && (
        <Link href={href} className={`text-xs font-semibold tracking-[0.25em] uppercase underline-offset-8 hover:underline ${light ? "text-gold-light" : "text-navy"}`}>
          {linkLabel} →
        </Link>
      )}
    </Reveal>
  );
}

export function Usps() {
  return (
    <section className="border-b border-navy/10 bg-white">
      <div className="container-lux grid grid-cols-2 gap-px bg-navy/10 md:grid-cols-3 lg:grid-cols-6">
        {USPS.map((u, i) => (
          <Reveal key={u.title} delay={i * 0.06} y={16} className="bg-white px-4 py-8 text-center">
            <div className="mx-auto mb-3 h-px w-8 bg-gold" />
            <h3 className="text-[11px] font-bold tracking-[0.25em] text-navy uppercase">{u.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink/60">{u.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ShopGender({ men, women }: { men: Category[]; women: Category[] }) {
  return (
    <section className="grid md:grid-cols-2">
      {/* Women: cream, editorial, soft */}
      <div className="relative overflow-hidden bg-[#f3ede1] px-6 py-20 sm:px-12 lg:py-28">
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35),transparent_65%)]" />
        <Reveal>
          <p className="eyebrow">For Her</p>
          <h2 className="heading-lux mt-3 text-5xl text-navy italic sm:text-6xl">Shop Women</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/70">Delicate chains, luminous pendants and stacking rings, made to be lived in.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {women.map((c) => (
              <Link key={c.id} href={`/women?category=${c.slug}`} className="rounded-full border border-navy/20 px-4 py-2 text-xs tracking-wider text-navy transition hover:border-gold hover:bg-gold/10">{c.name}</Link>
            ))}
          </div>
          <Link href="/women" className="btn-navy mt-10">Explore Women</Link>
        </Reveal>
      </div>
      {/* Men: deep navy, geometric, bold */}
      <div className="relative overflow-hidden bg-navy-deep px-6 py-20 text-cream sm:px-12 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(212,175,55,0.06)_0_1px,transparent_1px_28px)]" />
        <div className="pointer-events-none absolute top-10 right-10 h-40 w-40 rotate-45 border border-gold/30" />
        <Reveal className="relative">
          <p className="eyebrow">For Him</p>
          <h2 className="mt-3 text-5xl font-extrabold tracking-tight uppercase sm:text-6xl">Shop Men</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">Strong lines, metallic finishes. Rings, chains and kadas built for every day.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {men.map((c) => (
              <Link key={c.id} href={`/men?category=${c.slug}`} className="border border-gold/40 px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase transition hover:bg-gold hover:text-navy">{c.name}</Link>
            ))}
          </div>
          <Link href="/men" className="btn-gold mt-10">Explore Men</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function ProductRail({ eyebrow, title, products, href, dark = false }: { eyebrow: string; title: React.ReactNode; products: ProductWithRelations[]; href: string; dark?: boolean }) {
  return (
    <section className={dark ? "bg-navy py-20 sm:py-28" : "py-20 sm:py-28"}>
      <div className="container-lux">
        <SectionHeading eyebrow={eyebrow} title={title} href={href} light={dark} />
        {products.length ? <ProductGrid products={products} dark={dark} /> : <EmptyCollection dark={dark} />}
      </div>
    </section>
  );
}

export function EmptyCollection({ dark = false, text = "Our new pieces are being polished. Check back soon." }: { dark?: boolean; text?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 border border-dashed px-6 py-16 text-center ${dark ? "border-cream/20 text-cream/70" : "border-navy/20 text-ink/60"}`}>
      <LogoMark size={48} className="bg-gold" />
      <p className="heading-lux text-2xl">Coming soon</p>
      <p className="max-w-sm text-sm">{text}</p>
    </div>
  );
}

export function FeaturedCollections({ categories }: { categories: Category[] }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container-lux">
        <SectionHeading eyebrow="Featured Collections" title="Find your signature" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={(i % 5) * 0.06}>
              <Link
                href={`/${c.gender}?category=${c.slug}`}
                className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden p-5 ${c.gender === "men" ? "bg-navy text-cream" : "bg-[#f3ede1] text-navy"}`}
              >
                <span className="absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40 transition duration-700 group-hover:scale-[2.2]" />
                <span className="relative text-[10px] tracking-[0.3em] text-gold uppercase">{c.gender}</span>
                <span className="heading-lux relative text-2xl">{c.name}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FALLBACK_PANELS = ["Morning rituals", "Golden hour", "Poolside", "After dark", "Workday shine", "Weekend stacks"];

export function ImageGallery({ eyebrow, title, images, variant }: { eyebrow: string; title: React.ReactNode; images: { url: string; alt: string; href: string }[]; variant: "editorial" | "lifestyle" }) {
  const items = images.length >= 3 ? images.slice(0, 6) : null;
  return (
    <section className={variant === "editorial" ? "py-20 sm:py-28" : "bg-[#f3ede1] py-20 sm:py-28"}>
      <div className="container-lux">
        <SectionHeading eyebrow={eyebrow} title={title} />
        <div className={`grid gap-3 sm:gap-4 ${variant === "editorial" ? "grid-cols-2 md:grid-cols-3 md:grid-rows-2" : "grid-cols-2 md:grid-cols-4"}`}>
          {(items ?? FALLBACK_PANELS.slice(0, variant === "editorial" ? 5 : 4).map((label) => ({ url: "", alt: label, href: "" }))).map((img, i) => {
            const tall = variant === "editorial" && i === 0;
            return (
              <CurtainReveal key={i} className={`relative overflow-hidden ${tall ? "row-span-2 aspect-[3/4] md:aspect-auto" : "aspect-square"}`}>
                {img.url ? (
                  <Link href={img.href} className="group block h-full w-full">
                    <Parallax className="absolute inset-[-10%]" distance={30}>
                      <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition duration-1000 group-hover:scale-105" />
                    </Parallax>
                  </Link>
                ) : (
                  <div className={`flex h-full w-full items-end p-5 ${i % 2 ? "bg-navy text-cream" : "bg-[linear-gradient(160deg,#e8c766,#d4af37_45%,#9c7c1f)] text-navy"}`}>
                    <span className="heading-lux text-2xl italic">{img.alt}</span>
                  </div>
                )}
              </CurtainReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WhyDhara() {
  const points = [
    ["01", "Built for real life", "Our pieces are made to handle water, sweat and daily wear, so you never have to take them off."],
    ["02", "Honest craftsmanship", "Premium plating and careful finishing for a fine-jewellery look at an everyday price."],
    ["03", "Personal service", "Order on WhatsApp and talk to a real person who confirms every detail with you."],
  ];
  return (
    <section className="bg-navy py-20 text-cream sm:py-28">
      <div className="container-lux grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <Reveal>
          <p className="eyebrow">Why Dhara Elegance</p>
          <h2 className="heading-lux mt-3 text-4xl leading-tight sm:text-5xl">
            Luxury you don&apos;t have to <span className="gold-text italic">save for later.</span>
          </h2>
        </Reveal>
        <div className="space-y-10">
          {points.map(([n, title, text], i) => (
            <Reveal key={n} delay={i * 0.1} className="flex gap-6 border-t border-cream/10 pt-8">
              <span className="font-display text-3xl text-gold">{n}</span>
              <div>
                <h3 className="text-sm font-semibold tracking-[0.2em] uppercase">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/65">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container-lux grid items-center gap-12 md:grid-cols-2">
        <CurtainReveal className="relative flex aspect-square items-center justify-center bg-[#f3ede1]">
          <LogoMark size={200} className="bg-navy" />
          <span className="absolute bottom-6 left-6 text-[10px] tracking-[0.4em] text-gold uppercase">Est. Dhara Elegance</span>
        </CurtainReveal>
        <Reveal>
          <p className="eyebrow">Our Story</p>
          <h2 className="heading-lux mt-3 text-4xl text-navy sm:text-5xl">Made to shine every day.</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink/70 sm:text-base">
            <p>Dhara Elegance began with a simple wish: jewellery you could put on in the morning and forget to take off — through the shower, the gym and the evening out.</p>
            <p>Every piece is anti-tarnish, waterproof, sweat-proof and skin-friendly, finished to look and feel premium. Jewellery that lives with you.</p>
          </div>
          <Link href="/about" className="btn-outline mt-8 text-navy">Read our story</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container-lux">
        <SectionHeading eyebrow="Customer Reviews" title="Loved, every day" />
        {reviews.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 6).map((r, i) => (
              <Reveal key={r.id} delay={(i % 3) * 0.08} className="card flex h-full flex-col p-8">
                <Stars rating={r.rating} />
                {r.title && <h3 className="heading-lux mt-4 text-xl text-navy">{r.title}</h3>}
                {r.body && <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">&ldquo;{r.body}&rdquo;</p>}
                <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-navy uppercase">
                  {r.author_name} {r.is_verified && <span className="ml-2 text-gold">✓ Verified purchase</span>}
                </p>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-navy/20 p-10 text-center text-sm text-ink/60">Reviews from our customers will appear here once they share their experience.</p>
        )}
      </div>
    </section>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, rating)}
      <span className="text-navy/15">{"★★★★★".slice(rating)}</span>
    </span>
  );
}

export function Instagram({ handle, images }: { handle: string | null; images: { url: string; alt: string }[] }) {
  const clean = handle?.replace(/^@/, "");
  return (
    <section className="py-20 sm:py-28">
      <div className="container-lux text-center">
        <Reveal>
          <p className="eyebrow">Instagram</p>
          <h2 className="heading-lux mt-3 text-4xl text-navy sm:text-5xl">{clean ? `@${clean}` : "Shine with us"}</h2>
          <p className="mt-3 text-sm text-ink/60">Tag us to be featured. See how our community wears Dhara Elegance.</p>
        </Reveal>
        {images.length > 0 && (
          <div className="mt-10 grid grid-cols-3 gap-2 md:grid-cols-6">
            {images.slice(0, 6).map((img, i) => (
              <CurtainReveal key={i} className="relative aspect-square overflow-hidden">
                <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 33vw, 16vw" className="object-cover" />
              </CurtainReveal>
            ))}
          </div>
        )}
        {clean && (
          <a href={`https://instagram.com/${encodeURIComponent(clean)}`} target="_blank" rel="noopener noreferrer" className="btn-navy mt-10">
            Follow on Instagram
          </a>
        )}
      </div>
    </section>
  );
}

export const FAQS = [
  ["Will my jewellery tarnish?", "Our pieces are anti-tarnish and designed for daily wear. With basic care they keep their colour and shine for a long time."],
  ["Can I wear it in water or at the gym?", "Yes. Dhara Elegance jewellery is waterproof and sweat-proof. Rinse with fresh water after swimming in chlorine or sea water and pat dry."],
  ["How do I place an order?", "Add pieces to your bag, enter your delivery details and tap “Place order on WhatsApp”. Your order is saved and WhatsApp opens with the order details — just press Send and our team will confirm."],
  ["How do I pay?", "We do not take payments on the website. After you send your order on WhatsApp, our team confirms availability, delivery and payment options with you directly."],
  ["Is it safe for sensitive skin?", "Our jewellery is skin-friendly and made for all-day comfort. If you have a specific allergy, message us and we will share material details."],
  ["Can I return or exchange?", "Delivered orders can request a return or exchange from your account. Our team reviews each request and contacts you on WhatsApp."],
];

export function Faq() {
  return (
    <section id="faq" className="bg-[#f3ede1] py-20 sm:py-28">
      <div className="container-lux max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="divide-y divide-navy/15 border-y border-navy/15">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-navy">
                {q}
                <span className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
