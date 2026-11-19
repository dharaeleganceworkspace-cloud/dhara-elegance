import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Stars } from "@/components/home/Sections";
import { moderateReview } from "../../actions";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("reviews").select("*, product:products(name)").order("status").order("created_at", { ascending: false }).limit(200);
  const reviews = (data ?? []) as (Review & { product: { name: string } | null })[];

  return (
    <>
      <PageHeader title="Reviews" subtitle="New reviews stay hidden until approved. Verified purchase is set automatically from delivered orders." />
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 bg-white p-5 shadow-sm">
            <div className="max-w-2xl text-sm">
              <p className="text-xs text-ink/50">{r.product?.name} · {formatDate(r.created_at)} · <span className="font-semibold capitalize">{r.status}</span></p>
              <Stars rating={r.rating} />
              {r.title && <p className="font-semibold text-navy">{r.title}</p>}
              {r.body && <p className="text-ink/70">{r.body}</p>}
              <p className="mt-1 text-xs">{r.author_name}{r.is_verified && <span className="ml-2 text-gold">✓ Verified purchase</span>}</p>
            </div>
            <form action={moderateReview} className="flex gap-2 text-xs">
              <input type="hidden" name="id" value={r.id} />
              {r.status !== "approved" && <button name="op" value="approved" className="bg-emerald-700 px-3 py-1.5 text-white">Approve</button>}
              {r.status !== "hidden" && <button name="op" value="hidden" className="border border-navy/30 px-3 py-1.5">Hide</button>}
              <ConfirmButton message="Remove this review permanently?" name="op" value="delete" className="border border-red-700 px-3 py-1.5 text-red-700">Remove</ConfirmButton>
            </form>
          </div>
        ))}
        {!reviews.length && <p className="bg-white p-8 text-center text-sm text-ink/50">No reviews yet.</p>}
      </div>
    </>
  );
}
