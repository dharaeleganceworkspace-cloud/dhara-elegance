import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

export default async function AccountOrdersPage() {
  const { supabase, user } = await requireUser("/account/orders");
  const { data } = await supabase.from("orders").select("id,order_number,total,status,created_at,order_items(count)").eq("user_id", user.id).order("created_at", { ascending: false });
  const orders = (data ?? []) as (Pick<Order, "id" | "order_number" | "total" | "status" | "created_at"> & { order_items: { count: number }[] })[];

  return (
    <div>
      <h2 className="heading-lux mb-6 text-3xl text-navy">Orders</h2>
      {orders.length ? (
        <ul className="divide-y divide-navy/10 border-y border-navy/10">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-white">
                <div>
                  <p className="font-semibold text-navy">{o.order_number}</p>
                  <p className="text-xs text-ink/55">{formatDate(o.created_at)} · {o.order_items[0]?.count ?? 0} item(s)</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold">{formatINR(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/60">No orders yet. Orders placed while signed in appear here.</p>
      )}
    </div>
  );
}
