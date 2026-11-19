import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { WhatsAppIcon } from "@/components/icons";
import { formatDate, formatINR } from "@/lib/format";
import { buildCustomerChatLink } from "@/lib/whatsapp";
import type { Order } from "@/lib/types";

export const metadata = { title: "Customers" };

type O = Pick<Order, "id" | "order_number" | "user_id" | "customer_name" | "phone" | "email" | "total" | "status" | "created_at">;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { supabase } = await requireAdmin();
  const q = String((await searchParams).q ?? "").toLowerCase().trim();
  // shortcut: customers are grouped in memory from the latest 5000 orders + profiles; move to a SQL view past that size.
  const [{ data: profiles }, { data: orders }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone,email,created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("orders").select("id,order_number,user_id,customer_name,phone,email,total,status,created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("site_settings").select("whatsapp_country_code").eq("id", 1).maybeSingle(),
  ]);

  const map = new Map<string, { name: string; phone: string | null; email: string | null; registered: string | null; orders: O[] }>();
  for (const p of profiles ?? []) map.set(`u:${p.id}`, { name: p.full_name ?? "—", phone: p.phone, email: p.email, registered: p.created_at, orders: [] });
  for (const o of (orders ?? []) as O[]) {
    const key = o.user_id ? `u:${o.user_id}` : `g:${o.phone}`;
    const c = map.get(key) ?? { name: o.customer_name, phone: o.phone, email: o.email, registered: null, orders: [] };
    if (!c.phone) c.phone = o.phone;
    c.orders.push(o);
    map.set(key, c);
  }
  const customers = [...map.entries()]
    .map(([key, c]) => ({ key, ...c }))
    .filter((c) => !q || [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => (b.orders[0]?.created_at ?? b.registered ?? "").localeCompare(a.orders[0]?.created_at ?? a.registered ?? ""));
  const cc = settings?.whatsapp_country_code ?? "91";

  return (
    <>
      <PageHeader title="Customers" subtitle={`${customers.length} customers (registered and guest)`} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Name, phone or email" className="input max-w-sm py-2" />
        <button className="btn-outline py-2 text-navy">Search</button>
      </form>
      <div className="space-y-2">
        {customers.map((c) => {
          const last = c.orders[0];
          const chat = c.phone && last ? buildCustomerChatLink(c.phone, last.order_number, c.name, cc) : null;
          return (
            <details key={c.key} className="bg-white shadow-sm">
              <summary className="grid cursor-pointer list-none grid-cols-2 gap-2 p-4 text-sm md:grid-cols-[1.5fr_1fr_1.5fr_1fr_0.6fr_1fr]">
                <span className="font-semibold text-navy">{c.name}</span>
                <span>{c.phone ? `+${c.phone.replace(/^\+/, "")}` : "—"}</span>
                <span className="truncate text-ink/70">{c.email ?? "—"}</span>
                <span className="text-xs text-ink/60">{c.registered ? `Joined ${formatDate(c.registered)}` : "Guest"}</span>
                <span>{c.orders.length} orders</span>
                <span className="text-xs text-ink/60">{last ? `Last: ${formatDate(last.created_at)}` : "No orders"}</span>
              </summary>
              <div className="border-t border-navy/5 p-4">
                {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mb-4 py-2"><WhatsAppIcon /> Chat on WhatsApp</a>}
                <ul className="divide-y divide-navy/5 text-sm">
                  {c.orders.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/admin/orders/${o.id}`} className="text-navy underline">{o.order_number}</Link>
                      <span className="text-xs">{formatDate(o.created_at)}</span>
                      <StatusBadge status={o.status} />
                      <span>{formatINR(o.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
        {!customers.length && <p className="bg-white p-8 text-center text-sm text-ink/50">No customers yet.</p>}
      </div>
    </>
  );
}
