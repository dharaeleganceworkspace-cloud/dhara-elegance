"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/product/ProductCard";
import { useStore } from "@/components/store/StoreProvider";
import { useProducts } from "@/components/store/useProducts";

export default function WishlistPage() {
  const { wishlist, ready } = useStore();
  const { products, loading } = useProducts(wishlist);
  const list = wishlist.map((id) => products[id]).filter((p) => p !== undefined);

  return (
    <div className="container-lux py-12 sm:py-16">
      <p className="eyebrow">Wishlist</p>
      <h1 className="heading-lux mt-3 mb-10 text-4xl text-navy sm:text-5xl">Saved for later</h1>
      {!ready || loading ? (
        <div className="h-64 animate-pulse bg-navy/5" />
      ) : list.length ? (
        <ProductGrid products={list} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-ink/60">Tap the heart on any piece to save it here.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/women" className="btn-navy">Shop Women</Link>
            <Link href="/men" className="btn-outline text-navy">Shop Men</Link>
          </div>
        </div>
      )}
    </div>
  );
}
