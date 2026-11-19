"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "./StoreProvider";
import { priceLines, shippingFor, useProducts, type PricedLine } from "./useProducts";
import { formatINR } from "@/lib/format";

export function useCart() {
  const store = useStore();
  const { products, loading } = useProducts(store.lines.map((l) => l.product_id));
  const priced = priceLines(store.lines, products);
  const subtotal = priced.reduce((s, l) => s + (l.problem && !l.product ? 0 : l.unitPrice * l.quantity), 0);
  const shipping = shippingFor(subtotal, store.settings);
  const hasProblem = priced.some((l) => l.problem);
  return { ...store, priced, subtotal, shipping, loading: loading || !store.ready, hasProblem };
}

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { priced, loading, setQty, remove, setDrawerOpen } = useCart();

  if (loading) return <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse bg-navy/5" />)}</div>;
  if (!priced.length)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="heading-lux mb-2 text-2xl text-navy">Your bag is empty</p>
        <p className="mb-6 text-sm text-ink/60">Discover jewellery made to shine every day.</p>
        <div className="flex gap-3">
          <Link href="/women" onClick={() => setDrawerOpen(false)} className="btn-navy">Shop Women</Link>
          <Link href="/men" onClick={() => setDrawerOpen(false)} className="btn-outline text-navy">Shop Men</Link>
        </div>
      </div>
    );

  return (
    <ul className="divide-y divide-navy/10">
      <AnimatePresence initial={false}>
        {priced.map((l) => (
          <motion.li key={`${l.product_id}|${l.variant_id}`} layout exit={{ opacity: 0, x: 40 }} className="flex gap-4 py-4">
            <LineImage line={l} size={compact ? 80 : 110} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  {l.product ? (
                    <Link href={`/product/${l.product.slug}`} onClick={() => setDrawerOpen(false)} className="font-display text-lg leading-tight text-navy hover:text-gold">{l.product.name}</Link>
                  ) : (
                    <span className="font-display text-lg text-ink/50">Unavailable item</span>
                  )}
                  {l.variantName && <p className="text-xs text-ink/60">Size: {l.variantName}</p>}
                  <p className="text-xs text-ink/60">{formatINR(l.unitPrice)} each</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-navy">{formatINR(l.unitPrice * l.quantity)}</p>
              </div>
              {l.problem && <p className="mt-1 text-xs font-medium text-red-700">{l.problem}</p>}
              <div className="mt-auto flex items-center justify-between pt-2">
                <QtyStepper value={l.quantity} max={Math.max(1, Math.min(20, l.available))} onChange={(q) => setQty(l.product_id, l.variant_id, q)} disabled={!l.product} />
                <button onClick={() => remove(l.product_id, l.variant_id)} className="text-xs tracking-wider text-ink/50 uppercase underline-offset-4 hover:text-red-700 hover:underline">Remove</button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function LineImage({ line, size }: { line: PricedLine; size: number }) {
  const img = line.product?.images[0];
  return (
    <div className="relative shrink-0 overflow-hidden bg-navy/5" style={{ width: size, height: size }}>
      {img ? <Image src={img.url} alt={img.alt_text ?? line.product?.name ?? ""} fill sizes={`${size}px`} className="object-cover" /> : <div className="flex h-full items-center justify-center font-display text-2xl text-gold">DE</div>}
    </div>
  );
}

export function QtyStepper({ value, max, onChange, disabled }: { value: number; max: number; onChange: (q: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center border border-navy/20 bg-white">
      <button type="button" disabled={disabled || value <= 1} aria-label="Decrease quantity" onClick={() => onChange(value - 1)} className="h-9 w-9 text-navy disabled:opacity-30">−</button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button type="button" disabled={disabled || value >= max} aria-label="Increase quantity" onClick={() => onChange(value + 1)} className="h-9 w-9 text-navy disabled:opacity-30">+</button>
    </div>
  );
}

export function CartTotals() {
  const { subtotal, shipping, settings } = useCart();
  const remaining = settings.free_shipping_min !== null ? settings.free_shipping_min - subtotal : 0;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
      <div className="flex justify-between"><dt className="text-ink/60">Shipping</dt><dd>{shipping > 0 ? formatINR(shipping) : "Free"}</dd></div>
      {remaining > 0 && <p className="text-xs text-gold">Add {formatINR(remaining)} more for free shipping.</p>}
      <div className="flex justify-between border-t border-navy/10 pt-2 text-base font-semibold text-navy"><dt>Estimated Total</dt><dd>{formatINR(subtotal + shipping)}</dd></div>
      <p className="text-[11px] text-ink/50">Coupons are applied at checkout. Final prices are confirmed by our server when you place the order.</p>
    </dl>
  );
}
