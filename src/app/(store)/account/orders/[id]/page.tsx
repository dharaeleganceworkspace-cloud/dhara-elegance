import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "@/components/ActionForm";
import { requestReturn } from "../../actions";
import { STATUS_LABEL, type Order, type OrderItem, type OrderStatusHistory } from "@/lib/types";

export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser("/account/orders");
  // RLS limits this to the signed-in customer's own orders.
  const { data } = await supabase.from("orders").select("*, order_items(*), order_status_history(*), return_requests(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const order = data as Order & {
    order_items: OrderItem[];
    order_status_history: OrderStatusHistory[];
    return_requests: { id: string; request_type: string; status: string; reason: string; admin_note: string | null; created_at: string }[];
  };
  const history = [...order.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const a = order.shipping_address;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-xs text-ink/50 hover:text-gold">← All orders</Link>
          <h2 className="heading-lux mt-2 text-3xl text-navy">{order.order_number}</h2>
          <p className="text-xs text-ink/55">Placed {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="divide-y divide-navy/10 border-y border-navy/10 text-sm">
        {order.order_items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-4">
            <div>
              <p className="text-navy">{i.product_name}</p>
              <p className="text-xs text-ink/55">{i.variant_name && <>Size {i.variant_name} · </>}Qty {i.quantity} × {formatINR(i.unit_price)}</p>
            </div>
            <span className="font-semibold">{formatINR(i.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 sm:grid-cols-2">
        <dl className="space-y-1 text-sm">
          <Row k="Subtotal" v={formatINR(order.subtotal)} />
          <Row k="Discount" v={`−${formatINR(order.discount)}`} />
          <Row k="Shipping" v={Number(order.shipping) > 0 ? formatINR(order.shipping) : "Free"} />
          <Row k="Total" v={formatINR(order.total)} bold />
          <p className="pt-2 text-xs text-ink/50">Payment is arranged directly with Dhara Elegance on WhatsApp.</p>
        </dl>
        <div className="text-sm text-ink/70">
          <p className="label">Delivery address</p>
          <p>{order.customer_name} · {order.phone}</p>
          <p>{a.line1}{a.landmark ? `, ${a.landmark}` : ""}</p>
          <p>{a.city}, {a.state} {a.pincode}, {a.country}</p>
        </div>
      </div>

      <div>
        <p className="label">Order timeline</p>
        <ol className="mt-3 space-y-3 border-l border-gold/50 pl-5 text-sm">
          {history.map((h) => (
            <li key={h.id}>
              <span className="font-semibold text-navy">{STATUS_LABEL[h.to_status]}</span> <span className="text-xs text-ink/50">· {formatDate(h.created_at)}</span>
            </li>
          ))}
        </ol>
      </div>

      {order.return_requests.length > 0 && (
        <div>
          <p className="label">Return / exchange requests</p>
          {order.return_requests.map((r) => (
            <p key={r.id} className="text-sm text-ink/70">
              <span className="capitalize">{r.request_type}</span> — <strong className="capitalize">{r.status}</strong>
              {r.admin_note && <> · {r.admin_note}</>}
            </p>
          ))}
        </div>
      )}

      {order.status === "delivered" && order.return_requests.length === 0 && (
        <div className="bg-white p-6">
          <p className="heading-lux mb-4 text-xl text-navy">Request a return or exchange</p>
          <ActionForm action={requestReturn} submitLabel="Send request" hideOnSuccess>
            <input type="hidden" name="order_id" value={order.id} />
            <select name="request_type" className="input" aria-label="Request type">
              <option value="exchange">Exchange</option>
              <option value="return">Return</option>
            </select>
            <textarea name="reason" required minLength={5} rows={3} className="input" placeholder="Tell us what went wrong" aria-label="Reason" />
          </ActionForm>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-navy/10 pt-2 font-semibold text-navy" : ""}`}>
      <dt className={bold ? "" : "text-ink/60"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
