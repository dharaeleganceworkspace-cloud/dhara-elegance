"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitReview } from "@/app/(store)/product/[slug]/actions";
import { useStore } from "@/components/store/StoreProvider";
import type { ActionResult } from "@/lib/types";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { userId } = useStore();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReview, null);

  if (!userId) {
    return (
      <p className="text-sm text-ink/60">
        <Link href={`/login?next=/product/${slug}`} className="text-navy underline">Sign in</Link> to write a review.
      </p>
    );
  }
  if (state?.ok) return <p className="text-sm text-emerald-700">{state.message}</p>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className="label" htmlFor="rating">Rating</label>
        <select id="rating" name="rating" defaultValue="5" className="input">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" maxLength={120} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="body">Your review</label>
        <textarea id="body" name="body" rows={4} maxLength={2000} className="input" />
      </div>
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-navy">{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
