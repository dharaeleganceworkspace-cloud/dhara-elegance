import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Pager, Table } from "@/components/admin/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };
const PER = 25;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()*:\\."']/g, " ").trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase.from("orders").select("id,order_number,customer_name,phone,total,status,created_at,order_items(count)", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q.replace(/\D/g, "") || q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  const orders = (data ?? []) as (Pick<Order, "id" | "order_number" | "customer_name" | "phone" | "total" | "status" | "created_at"> & { order_items: { count: number }[] })[];

  const link = (s: OrderStatus | null) => `/admin/orders${s ? `?status=${s}` : ""}`;
  return (
    <>
      <PageHeader title="Orders" subtitle={`${count ?? 0} orders${status ? ` · ${STATUS_LABEL[status]}` : ""}`} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={link(null)} className={`px-3 py-1.5 text-xs whitespace-nowrap ${!status ? "bg-navy text-cream" : "bg-white"}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={link(s)} className={`px-3 py-1.5 text-xs whitespace-nowrap ${status === s ? "bg-navy text-cream" : "bg-white"}`}>{STATUS_LABEL[s]}</Link>
        ))}
      </div>
      <form className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Order number, name or phone" className="input max-w-sm py-2" />
        <button className="btn-outline py-2 text-navy">Search</button>
      </form>
      <Table head={["Order Number", "Customer Name", "Customer Phone", "Products", "Final Total", "Order Date", "Status"]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-cream">
            <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-navy underline-offset-4 hover:underline">{o.order_number}</Link></td>
            <td className="px-4 py-3">{o.customer_name}</td>
            <td className="px-4 py-3">+{o.phone}</td>
            <td className="px-4 py-3">{o.order_items[0]?.count ?? 0}</td>
            <td className="px-4 py-3">{formatINR(o.total)}</td>
            <td className="px-4 py-3 text-xs">{formatDate(o.created_at)}</td>
            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil((count ?? 0) / PER)} href={(n) => `/admin/orders?${new URLSearchParams({ ...(status ? { status } : {}), q, page: String(n) })}`} />
    </>
  );
}
