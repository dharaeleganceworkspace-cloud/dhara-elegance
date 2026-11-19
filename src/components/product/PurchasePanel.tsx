"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { QtyStepper } from "@/components/store/CartView";
import { WishlistButton } from "./WishlistButton";
import { ShareIcon } from "@/components/icons";
import { discountPercent, formatINR } from "@/lib/format";
import type { ProductWithRelations } from "@/lib/types";

export function PurchasePanel({ product }: { product: ProductWithRelations }) {
  const { add, notify, setDrawerOpen } = useStore();
  const router = useRouter();
  const hasVariants = product.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(hasVariants ? (product.variants.find((v) => v.stock > 0)?.id ?? null) : null);
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId);
  const price = variant?.price ?? product.price;
  const stock = hasVariants ? (variant?.stock ?? 0) : product.stock;
  const off = discountPercent(price, product.compare_at_price);
  const canBuy = stock > 0 && (!hasVariants || Boolean(variant));

  const addToCart = (buyNow = false) => {
    if (!canBuy) return;
    add({ product_id: product.id, variant_id: variantId, quantity: Math.min(qty, stock) });
    if (buyNow) {
      setDrawerOpen(false);
      router.push("/checkout");
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: product.name, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      notify("Link copied");
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-navy">{formatINR(price)}</span>
        {off > 0 && (
          <>
            <span className="text-ink/40 line-through">{formatINR(product.compare_at_price ?? 0)}</span>
            <span className="bg-gold px-2 py-0.5 text-xs font-bold text-navy">SAVE {off}%</span>
          </>
        )}
      </div>

      {hasVariants && (
        <fieldset>
          <legend className="label">Size {variant && <span className="text-ink/50 normal-case">— {variant.name}</span>}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                aria-pressed={v.id === variantId}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                className={`min-w-12 border px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${v.id === variantId ? "border-navy bg-navy text-cream" : "border-navy/20 bg-white text-navy hover:border-gold"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className={`text-sm font-medium ${stock <= 0 ? "text-red-700" : stock <= product.low_stock_threshold ? "text-amber-700" : "text-emerald-700"}`}>
        {stock <= 0 ? "Out of stock" : stock <= product.low_stock_threshold ? `Only ${stock} left — order soon` : "In stock, ready to ship"}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <span className="label">Quantity</span>
          <QtyStepper value={qty} max={Math.max(1, Math.min(20, stock))} onChange={setQty} disabled={!canBuy} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button disabled={!canBuy} onClick={() => addToCart(false)} className="btn-navy py-4">Add to Bag</button>
        <button disabled={!canBuy} onClick={() => addToCart(true)} className="btn-gold py-4">Order Now</button>
      </div>
      <div className="flex gap-3">
        <WishlistButton productId={product.id} withLabel className="flex-1" />
        <button onClick={share} className="btn-outline flex-1 text-navy"><ShareIcon width={16} height={16} /> Share</button>
      </div>
      <p className="text-xs leading-relaxed text-ink/55">No online payment. Place your order and continue on WhatsApp — our team confirms availability, delivery and payment with you directly.</p>
    </div>
  );
}
