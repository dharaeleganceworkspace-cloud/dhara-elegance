import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/ActionForm";
import { updateReturn } from "../../actions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Returns & Exchanges" };

interface Req {
  id: string;
  request_type: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  order: { id: string; order_number: string; customer_name: string; phone: string } | null;
}

export default async function ReturnsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("return_requests").select("*, order:orders(id,order_number,customer_name,phone)").order("created_at", { ascending: false }).limit(200);
  const reqs = (data ?? []) as unknown as Req[];

  return (
    <>
      <PageHeader title="Returns & Exchanges" subtitle="No cash refunds are processed here. Approve or reject, add a note, and follow up on WhatsApp." />
      <div className="space-y-3">
        {reqs.map((r) => (
          <div key={r.id} className="grid gap-4 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr]">
            <div className="text-sm">
              <p className="font-semibold text-navy capitalize">{r.request_type} · {r.status}</p>
              {r.order && <Link href={`/admin/orders/${r.order.id}`} className="text-xs underline">{r.order.order_number} · {r.order.customer_name} · +{r.order.phone}</Link>}
              <p className="mt-2 text-ink/70">{r.reason}</p>
              <p className="mt-1 text-xs text-ink/40">{formatDate(r.created_at)}</p>
            </div>
            <ActionForm action={updateReturn} submitLabel="Save" className="space-y-2" buttonClassName="btn-navy py-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className="input py-2" aria-label="Status">
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
              <textarea name="admin_note" defaultValue={r.admin_note ?? ""} rows={2} placeholder="Note (visible to the customer)" className="input" aria-label="Note" />
            </ActionForm>
          </div>
        ))}
        {!reqs.length && <p className="bg-white p-8 text-center text-sm text-ink/50">No return or exchange requests.</p>}
      </div>
    </>
  );
}
