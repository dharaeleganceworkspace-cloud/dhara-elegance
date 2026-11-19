import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "@/components/ActionForm";
import { CopyButton } from "@/components/admin/CopyButton";
import { WhatsAppIcon } from "@/components/icons";
import { addOrderNote, setOrderStatus } from "../../../actions";
import { formatDate, formatINR } from "@/lib/format";
import { buildCustomerChatLink, buildWhatsAppOrderLink, buildWhatsAppOrderMessage } from "@/lib/whatsapp";
import { STATUS_LABEL, type Order, type OrderItem, type OrderStatus, type OrderStatusHistory } from "@/lib/types";

export const metadata = { title: "Order" };

const NEXT: Record<OrderStatus, [OrderStatus, string][]> = {
  new: [["pending_confirmation", "Mark Pending"], ["confirmed", "Confirm Order"], ["cancelled", "Cancel Order"]],
  pending_confirmation: [["confirmed", "Confirm Order"], ["cancelled", "Cancel Order"]],
  confirmed: [["processing", "Mark Processing"], ["shipped", "Mark Shipped"], ["cancelled", "Cancel Order"]],
  processing: [["shipped", "Mark Shipped"], ["cancelled", "Cancel Order"]],
  shipped: [["delivered", "Mark Delivered"]],
  delivered: [],
  cancelled: [],
};

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, { data: notes }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), order_status_history(*)").eq("id", id).maybeSingle(),
    supabase.from("order_notes").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("site_settings").select("whatsapp_country_code").eq("id", 1).maybeSingle(),
  ]);
  if (!data) notFound();
  const order = data as Order & { order_items: OrderItem[]; order_status_history: OrderStatusHistory[] };
  const a = order.shipping_address;
  const history = [...order.order_status_history].sort((x, y) => x.created_at.localeCompare(y.created_at));

  const waOrder = {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    total: Number(order.total),
    items: order.order_items.map((i) => ({ ...i, unit_price: Number(i.unit_price), line_total: Number(i.line_total) })),
  };
  const message = buildWhatsAppOrderMessage(waOrder);
  // Uses the business number saved on the order when it was placed, not today's setting.
  const orderLink = order.whatsapp_number ? buildWhatsAppOrderLink(order.whatsapp_number, waOrder) : null;
  const customerLink = buildCustomerChatLink(order.phone, order.order_number, order.customer_name, settings?.whatsapp_country_code ?? "91");

  return (
    <>
      <Link href="/admin/orders" className="text-xs text-ink/50 hover:text-gold">← Orders</Link>
      <PageHeader title={order.order_number} subtitle={`Placed ${formatDate(order.created_at)}${order.user_id ? " · registered customer" : " · guest"}`} action={<StatusBadge status={order.status} />} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Products">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-[11px] text-ink/50 uppercase">
                  <tr><th className="py-2">Product</th><th>Variant / Size</th><th>Qty</th><th>Unit price</th><th className="text-right">Line total</th></tr>
                </thead>
                <tbody className="divide-y divide-navy/5">
                  {order.order_items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-3">
                        {i.product_id ? <Link href={`/admin/products/${i.product_id}/edit`} className="text-navy hover:text-gold">{i.product_name}</Link> : i.product_name}
                        {i.sku && <p className="text-xs text-ink/40">{i.sku}</p>}
                      </td>
                      <td>{i.variant_name ?? "—"}</td>
                      <td>{i.quantity}</td>
                      <td>{formatINR(i.unit_price)}</td>
                      <td className="text-right">{formatINR(i.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Discount{order.coupon_code && ` (${order.coupon_code})`}</dt><dd>−{formatINR(order.discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Shipping</dt><dd>{formatINR(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-navy/10 pt-2 font-semibold text-navy"><dt>Final total</dt><dd>{formatINR(order.total)}</dd></div>
              <p className="pt-1 text-xs text-ink/50">Not paid online. Payment is arranged on WhatsApp.</p>
            </dl>
          </Panel>

          <Panel title="Order history">
            <ol className="space-y-3 border-l border-gold/60 pl-5 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="font-semibold text-navy">{h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : ""}{STATUS_LABEL[h.to_status]}</span>
                  <span className="text-xs text-ink/50"> · {formatDate(h.created_at)}</span>
                  {h.note && <p className="text-ink/70">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Internal notes">
            <ActionForm action={addOrderNote} submitLabel="Add internal note" buttonClassName="btn-outline py-2 text-navy">
              <input type="hidden" name="id" value={order.id} />
              <textarea name="note" rows={2} required className="input" placeholder="Only visible to admins" aria-label="Internal note" />
            </ActionForm>
            <ul className="mt-4 space-y-3 text-sm">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="border-l-2 border-navy/20 pl-3">
                  <p>{n.note}</p>
                  <p className="text-xs text-ink/40">{formatDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Actions">
            {NEXT[order.status].length ? (
              <div className="space-y-3">
                {NEXT[order.status].map(([s, label]) => (
                  <ActionForm key={s} action={setOrderStatus} submitLabel={label} className="space-y-2" buttonClassName={`w-full ${s === "cancelled" ? "btn border border-red-700 text-red-700 hover:bg-red-700 hover:text-white" : "btn-navy"}`}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value={s} />
                    {s === "cancelled" && <input name="note" placeholder="Reason (optional) — stock is restored once" className="input py-2 text-xs" />}
                  </ActionForm>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/60">This order is {STATUS_LABEL[order.status].toLowerCase()}. No further status changes.</p>
            )}
            {order.stock_restored && <p className="mt-3 text-xs text-ink/50">Stock for this order has been restored.</p>}
          </Panel>

          <Panel title="Customer">
            <dl className="space-y-1 text-sm">
              <p className="font-semibold text-navy">{order.customer_name}</p>
              <p>+{order.phone}</p>
              {order.email && <p>{order.email}</p>}
              <p className="pt-2 text-ink/70">{a.line1}{a.landmark && `, ${a.landmark}`}<br />{a.city}, {a.state} {a.pincode}<br />{a.country}</p>
              {order.notes && <p className="mt-3 bg-cream p-3 text-ink/80"><span className="label">Customer notes</span>{order.notes}</p>}
            </dl>
          </Panel>

          <Panel title="WhatsApp">
            <div className="space-y-2">
              {customerLink && <a href={customerLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full"><WhatsAppIcon /> Open Customer Chat</a>}
              {orderLink && <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btn-outline w-full text-navy">Reopen WhatsApp Order Link</a>}
              <CopyButton text={message} label="Copy Order Message" />
              <CopyButton text={`${order.customer_name}\n+${order.phone}\n${a.line1}${a.landmark ? `, ${a.landmark}` : ""}\n${a.city}, ${a.state} ${a.pincode}\n${a.country}`} label="Copy Delivery Address" />
            </div>
            <p className="mt-3 text-xs text-ink/50">Order sent to business number: {order.whatsapp_number ? `+${order.whatsapp_number}` : "not configured at the time"}.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
