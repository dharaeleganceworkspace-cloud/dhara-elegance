"use client";

import Link from "next/link";
import { CartLines, CartTotals, useCart } from "@/components/store/CartView";

export default function CartPage() {
  const { priced, hasProblem } = useCart();
  return (
    <div className="container-lux py-12 sm:py-16">
      <p className="eyebrow">Your Bag</p>
      <h1 className="heading-lux mt-3 mb-10 text-4xl text-navy sm:text-5xl">Review your pieces</h1>
      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <CartLines />
        {priced.length > 0 && (
          <aside className="h-fit space-y-5 bg-white p-6 sm:p-8 lg:sticky lg:top-28">
            <CartTotals />
            {hasProblem && <p className="text-sm text-red-700">Please update the items marked above before ordering.</p>}
            <Link href="/checkout" aria-disabled={hasProblem} className={`btn-navy w-full py-4 ${hasProblem ? "pointer-events-none opacity-50" : ""}`}>Proceed to Order</Link>
            <Link href="/" className="block text-center text-xs tracking-widest text-ink/60 uppercase hover:text-gold">Continue shopping</Link>
          </aside>
        )}
      </div>
    </div>
  );
}
