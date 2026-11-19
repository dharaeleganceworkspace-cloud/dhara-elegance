import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL, type Order } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true });
  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const since = startOfDayDaysAgo(13);

  const [totalProducts, activeProducts, totalOrders, totalCustomers, statusCounts, stockRows, recent, best, activity, lastTwoWeeks] = await Promise.all([
    n(head("products").eq("is_archived", false)),
    n(head("products").eq("is_active", true).eq("is_archived", false)),
    n(head("orders")),
    n(head("profiles")),
    Promise.all(ORDER_STATUSES.map(async (s) => [s, await n(head("orders").eq("status", s))] as const)),
    // shortcut: low-stock is computed in JS (PostgREST can't compare two columns); fine up to ~2000 products, then add an RPC.
    supabase.from("products").select("id,name,stock,low_stock_threshold").eq("is_archived", false).limit(2000),
    supabase.from("orders").select("id,order_number,customer_name,total,status,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("products").select("id,name,sold_count").eq("is_archived", false).gt("sold_count", 0).order("sold_count", { ascending: false }).limit(5),
    supabase.from("audit_logs").select("id,action,entity,details,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("orders").select("created_at").gte("created_at", since.toISOString()),
  ]);

  const statuses = Object.fromEntries(statusCounts) as Record<(typeof ORDER_STATUSES)[number], number>;
  const products = stockRows.data ?? [];
  const outOfStock = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.low_stock_threshold);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 864e5);
    return { key: d.toDateString(), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), n: 0 };
  });
  for (const o of lastTwoWeeks.data ?? []) {
    const day = days.find((d) => d.key === new Date(o.created_at as string).toDateString());
    if (day) day.n++;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const stats: [string, number, string?][] = [
    ["Total Products", totalProducts, "/admin/products"],
    ["Active Products", activeProducts, "/admin/products?state=active"],
    ["Total Orders", totalOrders, "/admin/orders"],
    ["Total Customers", totalCustomers, "/admin/customers"],
    ["Low Stock", lowStock.length, "/admin/inventory?filter=low"],
    ["Out of Stock", outOfStock.length, "/admin/inventory?filter=out"],
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live data from Supabase. Order totals are not shown as revenue — payment is arranged on WhatsApp." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href ?? "#"} className="bg-white p-5 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] tracking-wider text-ink/50 uppercase">{label}</p>
            <p className={`mt-2 font-display text-4xl ${label.includes("Stock") && value > 0 ? "text-amber-700" : "text-navy"}`}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className="bg-white p-4 shadow-sm hover:shadow-md">
            <p className="text-[10px] tracking-wider text-ink/50 uppercase">{STATUS_LABEL[s]}</p>
            <p className="mt-1 font-display text-3xl text-navy">{statuses[s]}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Orders — last 14 days">
          {totalOrders === 0 ? (
            <p className="text-sm text-ink/50">No orders yet.</p>
          ) : (
            <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Orders per day for the last 14 days">
              {days.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-ink/60">{d.n || ""}</span>
                  <div className="w-full bg-gold" style={{ height: `${(d.n / maxDay) * 120}px`, minHeight: d.n ? 4 : 1 }} />
                  <span className="hidden text-[9px] text-ink/40 sm:block">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Best sellers">
          {best.data?.length ? (
            <ol className="space-y-2 text-sm">
              {best.data.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${p.id}/edit`} className="hover:text-gold">{i + 1}. {p.name}</Link>
                  <span className="text-ink/50">{p.sold_count} sold</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink/50">No sales recorded yet.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent orders">
          {recent.data?.length ? (
            <ul className="divide-y divide-navy/5 text-sm">
              {(recent.data as Pick<Order, "id" | "order_number" | "customer_name" | "total" | "status" | "created_at">[]).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold">
                    <span><strong>{o.order_number}</strong> · {o.customer_name}</span>
                    <span className="flex items-center gap-3"><StatusBadge status={o.status} /> {formatINR(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/50">No orders yet.</p>
          )}
        </Panel>
        <Panel title="Recent activity">
          {activity.data?.length ? (
            <ul className="space-y-3 text-sm">
              {activity.data.map((a) => (
                <li key={a.id}>
                  <span className="font-medium text-navy">{a.action}</span> <span className="text-ink/50">· {formatDate(a.created_at as string)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/50">No activity yet.</p>
          )}
          <Link href="/admin/audit-logs" className="mt-4 block text-xs text-gold">View audit logs →</Link>
        </Panel>
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <Panel title="Stock alerts" className="mt-6">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[...outOfStock, ...lowStock].slice(0, 12).map((p) => (
              <li key={p.id} className="flex justify-between">
                <Link href={`/admin/products/${p.id}/edit`} className="hover:text-gold">{p.name}</Link>
                <span className={p.stock <= 0 ? "text-red-700" : "text-amber-700"}>{p.stock <= 0 ? "Out of stock" : `${p.stock} left`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function startOfDayDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 864e5);
  d.setHours(0, 0, 0, 0);
  return d;
}
