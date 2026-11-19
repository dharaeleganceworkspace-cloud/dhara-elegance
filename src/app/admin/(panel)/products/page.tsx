import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Pager, Table } from "@/components/admin/ui";
import { formatINR } from "@/lib/format";
import { setProductState } from "../../actions";
import type { ProductWithRelations } from "@/lib/types";

export const metadata = { title: "Products" };
const PER = 25;

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()*:\\."']/g, " ").trim() : "";
  const state = typeof sp.state === "string" ? sp.state : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase.from("products").select("*, category:categories(name,gender), images:product_images(url,is_primary,sort_order)", { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  if (state === "active") query = query.eq("is_active", true).eq("is_archived", false);
  else if (state === "inactive") query = query.eq("is_active", false).eq("is_archived", false);
  else if (state === "archived") query = query.eq("is_archived", true);
  else query = query.eq("is_archived", false);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  const products = (data ?? []) as unknown as (ProductWithRelations & { images: { url: string; is_primary: boolean; sort_order: number }[] })[];

  return (
    <>
      <PageHeader title="Products" subtitle={`${count ?? 0} products`} action={<Link href="/admin/products/new" className="btn-navy">+ Add product</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="input max-w-xs py-2" />
        <select name="state" defaultValue={state} className="input w-auto py-2">
          <option value="all">All (not archived)</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn-outline py-2 text-navy">Filter</button>
      </form>
      <Table head={["", "Product", "Category", "Price", "Stock", "Status", "Actions"]} empty={!products.length}>
        {products.map((p) => {
          const img = [...p.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
          return (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <div className="relative h-12 w-12 bg-navy/5">{img && <Image src={img.url} alt="" fill sizes="48px" className="object-cover" />}</div>
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/products/${p.id}/edit`} className="font-medium text-navy hover:text-gold">{p.name}</Link>
                <p className="text-xs text-ink/50">{p.sku ?? "—"}</p>
              </td>
              <td className="px-4 py-3 capitalize">{p.category?.name} · {p.gender}</td>
              <td className="px-4 py-3">{formatINR(p.price)}</td>
              <td className={`px-4 py-3 ${p.stock <= 0 ? "text-red-700" : p.stock <= p.low_stock_threshold ? "text-amber-700" : ""}`}>{p.stock}</td>
              <td className="px-4 py-3 text-xs">{p.is_archived ? "Archived" : p.is_active ? <span className="text-emerald-700">Active</span> : "Inactive"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2 text-xs">
                  <Link href={`/admin/products/${p.id}/edit`} className="text-navy underline">Edit</Link>
                  <form action={setProductState}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="op" value={p.is_archived ? "unarchive" : p.is_active ? "deactivate" : "activate"} />
                    <button className="text-ink/60 underline">{p.is_archived ? "Unarchive" : p.is_active ? "Deactivate" : "Activate"}</button>
                  </form>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pager page={page} pages={Math.ceil((count ?? 0) / PER)} href={(n) => `/admin/products?${new URLSearchParams({ q, state, page: String(n) })}`} />
    </>
  );
}
