"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { WishlistButton } from "./WishlistButton";
import { discountPercent, formatINR } from "@/lib/format";
import type { ProductWithRelations } from "@/lib/types";

export function ProductCard({ product, index = 0, dark = false }: { product: ProductWithRelations; index?: number; dark?: boolean }) {
  const [first, second] = product.images;
  const off = discountPercent(product.price, product.compare_at_price);
  const soldOut = product.stock <= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className={`relative aspect-[4/5] overflow-hidden ${dark ? "bg-navy-deep" : "bg-[#f1ece2]"}`}>
          {first ? (
            <>
              <Image src={first.url} alt={first.alt_text ?? product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-[1.2s] ease-out group-hover:scale-105" />
              {second && <Image src={second.url} alt={second.alt_text ?? product.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover opacity-0 transition duration-700 group-hover:opacity-100" />}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-display text-5xl text-gold/60">DE</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {soldOut && <Tag className="bg-ink text-cream">Sold Out</Tag>}
            {!soldOut && product.is_new && <Tag className="bg-cream text-navy">New</Tag>}
            {!soldOut && off > 0 && <Tag className="bg-gold text-navy">−{off}%</Tag>}
          </div>
        </div>
        <div className="pt-4">
          <p className={`text-[10px] tracking-[0.25em] uppercase ${dark ? "text-gold-light" : "text-gold"}`}>{product.category?.name}</p>
          <h3 className={`mt-1 font-display text-lg leading-snug ${dark ? "text-cream" : "text-navy"}`}>{product.name}</h3>
          <p className="mt-1 flex items-baseline gap-2 text-sm">
            <span className={`font-semibold ${dark ? "text-cream" : "text-navy"}`}>{formatINR(product.price)}</span>
            {off > 0 && <span className="text-xs text-ink/40 line-through">{formatINR(product.compare_at_price ?? 0)}</span>}
          </p>
        </div>
      </Link>
      <WishlistButton productId={product.id} className="absolute top-3 right-3" />
    </motion.article>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] uppercase ${className}`}>{children}</span>;
}

export function ProductGrid({ products, dark = false }: { products: ProductWithRelations[]; dark?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} dark={dark} />
      ))}
    </div>
  );
}
