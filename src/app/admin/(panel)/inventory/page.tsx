import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { ActionForm } from "@/components/ActionForm";
import { adjustStock } from "../../actions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Inventory" };

interface Row {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  variants: { id: string; name: string; stock: number; is_active: boolean }[];
}

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const { supabase } = await requireAdmin();
  const filter = String((await searchParams).filter ?? "all");
  const [{ data }, { data: tx }, { data: reserved }] = await Promise.all([
    supabase.from("products").select("id,name,sku,stock,low_stock_threshold,is_active,variants:product_variants(id,name,stock,is_active)").eq("is_archived", false).order("stock").limit(1000),
    supabase.from("inventory_transactions").select("id,change,reason,note,created_at,product:products(name),variant:product_variants(name),order:orders(order_number)").order("created_at", { ascending: false }).limit(40),
    // Stock held by orders that are placed but not yet shipped or cancelled.
    supabase.from("order_items").select("product_id,quantity,order:orders!inner(status)").in("order.status", ["new", "pending_confirmation", "confirmed", "processing"]),
  ]);

  const reservedBy = new Map<string, number>();
  for (const r of reserved ?? []) if (r.product_id) reservedBy.set(r.product_id, (reservedBy.get(r.product_id) ?? 0) + r.quantity);

  let rows = (data ?? []) as Row[];
  if (filter === "low") rows = rows.filter((r) => r.stock > 0 && r.stock <= r.low_stock_threshold);
  if (filter === "out") rows = rows.filter((r) => r.stock <= 0);

  type Tx = { id: string; change: number; reason: string; note: string | null; created_at: string; product: { name: string } | null; variant: { name: string } | null; order: { order_number: string } | null };

  return (
    <>
      <PageHeader title="Inventory" subtitle="Available stock is what customers can still order. Reserved stock is held by open orders and returns to available stock only if the order is cancelled." />
      <div className="mb-4 flex gap-2 text-xs">
        {[["all", "All"], ["low", "Low stock"], ["out", "Out of stock"]].map(([k, l]) => (
          <Link key={k} href={`/admin/inventory?filter=${k}`} className={`px-3 py-1.5 ${filter === k ? "bg-navy text-cream" : "bg-white"}`}>{l}</Link>
        ))}
      </div>
      <Table head={["Product", "Available", "Reserved (open orders)", "Sizes", "Adjust stock"]} empty={!rows.length}>
        {rows.map((r) => {
          const activeVariants = r.variants.filter((v) => v.is_active);
          return (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-3">
                <Link href={`/admin/products/${r.id}/edit`} className="font-medium text-navy hover:text-gold">{r.name}</Link>
                <p className="text-xs text-ink/40">{r.sku ?? ""}{!r.is_active && " · inactive"}</p>
              </td>
              <td className={`px-4 py-3 font-semibold ${r.stock <= 0 ? "text-red-700" : r.stock <= r.low_stock_threshold ? "text-amber-700" : ""}`}>{r.stock}</td>
              <td className="px-4 py-3">{reservedBy.get(r.id) ?? 0}</td>
              <td className="px-4 py-3 text-xs">{activeVariants.length ? activeVariants.map((v) => `${v.name}: ${v.stock}`).join(" · ") : "—"}</td>
              <td className="px-4 py-3">
                <ActionForm action={adjustStock} submitLabel="Apply" className="flex flex-wrap items-center gap-2" buttonClassName="border border-navy/30 px-3 py-1.5 text-xs">
                  <input type="hidden" name="product_id" value={r.id} />
                  {activeVariants.length ? (
                    <select name="variant_id" className="input w-auto py-1.5 text-xs" aria-label="Size">
                      {activeVariants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  ) : (
                    <input type="hidden" name="variant_id" value="" />
                  )}
                  <input name="change" type="number" required placeholder="+10 / -2" className="input w-24 py-1.5 text-xs" aria-label="Stock change" />
                  <input name="note" placeholder="Reason" className="input w-32 py-1.5 text-xs" aria-label="Reason" />
                </ActionForm>
              </td>
            </tr>
          );
        })}
      </Table>

      <Panel title="Inventory history (latest 40)" className="mt-6">
        <ul className="divide-y divide-navy/5 text-sm">
          {((tx ?? []) as unknown as Tx[]).map((t) => (
            <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <strong className={t.change > 0 ? "text-emerald-700" : "text-red-700"}>{t.change > 0 ? `+${t.change}` : t.change}</strong> {t.product?.name ?? "Deleted product"}
                {t.variant && ` (${t.variant.name})`} · <span className="text-ink/60 capitalize">{t.reason}</span>
                {t.order && ` · ${t.order.order_number}`}
                {t.note && <span className="text-ink/50"> · {t.note}</span>}
              </span>
              <span className="text-xs text-ink/40">{formatDate(t.created_at)}</span>
            </li>
          ))}
          {!tx?.length && <li className="py-4 text-ink/50">No stock movements yet.</li>}
        </ul>
      </Panel>
    </>
  );
}
