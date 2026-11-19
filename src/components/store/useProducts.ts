"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartLine, ProductWithRelations } from "@/lib/types";

const SELECT = "*, category:categories(id,name,slug,gender), images:product_images(*), variants:product_variants(*)";

/** Fetches live product data (price, stock, active state) for a set of ids from Supabase. */
export function useProducts(ids: string[]) {
  const [products, setProducts] = useState<Record<string, ProductWithRelations>>({});
  const [loading, setLoading] = useState(true);
  const idKey = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const list = idKey ? idKey.split(",") : [];
    if (!list.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to fetch
      setProducts({});
      setLoading(false);
      return;
    }
    setLoading(true);
    createClient()
      .from("products")
      .select(SELECT)
      .in("id", list)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, ProductWithRelations> = {};
        for (const p of (data ?? []) as unknown as ProductWithRelations[]) {
          map[p.id] = {
            ...p,
            price: Number(p.price),
            compare_at_price: p.compare_at_price === null ? null : Number(p.compare_at_price),
            images: [...p.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order),
            variants: p.variants.filter((v) => v.is_active).map((v) => ({ ...v, price: v.price === null ? null : Number(v.price) })),
          };
        }
        setProducts(map);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idKey]);

  return { products, loading };
}

export interface PricedLine extends CartLine {
  product: ProductWithRelations | undefined;
  variantName: string | null;
  unitPrice: number;
  available: number;
  problem: string | null;
}

export function priceLines(lines: CartLine[], products: Record<string, ProductWithRelations>): PricedLine[] {
  return lines.map((l) => {
    const product = products[l.product_id];
    const variant = l.variant_id ? product?.variants.find((v) => v.id === l.variant_id) : undefined;
    const unitPrice = variant?.price ?? product?.price ?? 0;
    const available = variant ? variant.stock : (product?.stock ?? 0);
    let problem: string | null = null;
    if (!product) problem = "No longer available";
    else if (l.variant_id && !variant) problem = "Selected size is unavailable";
    else if (available <= 0) problem = "Out of stock";
    else if (l.quantity > available) problem = `Only ${available} left`;
    return { ...l, product, variantName: variant?.name ?? null, unitPrice, available, problem };
  });
}

export function shippingFor(subtotal: number, settings: { shipping_fee: number; free_shipping_min: number | null }) {
  if (subtotal <= 0) return 0;
  if (settings.free_shipping_min !== null && subtotal >= settings.free_shipping_min) return 0;
  return settings.shipping_fee;
}
