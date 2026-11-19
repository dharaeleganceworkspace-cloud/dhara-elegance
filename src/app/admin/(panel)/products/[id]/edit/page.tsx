import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProductForm } from "../../ProductForm";
import { ImageManager } from "../../ImageManager";
import { setProductState } from "../../../../actions";
import type { Category, Product, ProductImage, ProductVariant } from "@/lib/types";

export const metadata = { title: "Edit Product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: cats }, { data: images }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("gender").order("sort_order"),
    supabase.from("product_images").select("*").eq("product_id", id),
    supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
  ]);
  if (!product) notFound();
  const p = product as Product;

  const stateButton = (op: string, label: string, cls = "btn-outline py-2 text-navy", confirmText?: string) => (
    <form action={setProductState}>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="op" value={op} />
      {confirmText ? <ConfirmButton className={cls} message={confirmText}>{label}</ConfirmButton> : <button className={cls}>{label}</button>}
    </form>
  );

  return (
    <>
      <Link href="/admin/products" className="text-xs text-ink/50 hover:text-gold">← Products</Link>
      <PageHeader
        title={p.name}
        subtitle={p.is_archived ? "Archived — hidden from the store" : p.is_active ? "Active on the store" : "Inactive — hidden from the store"}
        action={
          <div className="flex flex-wrap gap-2">
            {!p.is_archived && <Link href={`/product/${p.slug}`} target="_blank" className="btn-outline py-2 text-navy">View ↗</Link>}
            {p.is_archived ? stateButton("unarchive", "Unarchive") : stateButton(p.is_active ? "deactivate" : "activate", p.is_active ? "Deactivate" : "Activate")}
            {!p.is_archived && stateButton("archive", "Archive")}
            {stateButton("delete", "Delete", "btn border border-red-700 py-2 text-red-700 hover:bg-red-700 hover:text-white", "Delete this product permanently? Products that already have orders will be archived instead.")}
          </div>
        }
      />
      {sp.created && <p className="mb-6 bg-emerald-50 p-3 text-sm text-emerald-800">Product created. Now add images below.</p>}
      <div className="grid gap-6 2xl:grid-cols-[1.3fr_1fr]">
        <ProductForm product={p} variants={(variants ?? []) as ProductVariant[]} categories={(cats ?? []) as Category[]} />
        <Panel title="Images" className="h-fit">
          <ImageManager productId={p.id} productName={p.name} images={(images ?? []) as ProductImage[]} />
        </Panel>
      </div>
    </>
  );
}
