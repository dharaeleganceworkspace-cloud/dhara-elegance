import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { ActionForm } from "@/components/ActionForm";
import { saveCoupon, toggleCoupon } from "../../actions";
import { formatDate, formatINR } from "@/lib/format";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Coupons" subtitle="Discounts are validated and applied on the server when an order is placed." />
      <Panel title="New coupon" className="mb-6">
        <ActionForm action={saveCoupon} submitLabel="Create coupon" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" buttonClassName="btn-navy">
          <label><span className="label">Code</span><input name="code" required className="input py-2 uppercase" /></label>
          <label><span className="label">Type</span><select name="discount_type" className="input py-2"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label><span className="label">Value</span><input name="value" type="number" min={0.01} step="0.01" required className="input py-2" /></label>
          <label><span className="label">Minimum order (₹)</span><input name="min_amount" type="number" min={0} defaultValue={0} className="input py-2" /></label>
          <label><span className="label">Max discount (₹, optional)</span><input name="max_discount" type="number" min={0} className="input py-2" /></label>
          <label><span className="label">Expires (optional)</span><input name="expires_at" type="datetime-local" className="input py-2" /></label>
          <label><span className="label">Usage limit (optional)</span><input name="usage_limit" type="number" min={1} className="input py-2" /></label>
        </ActionForm>
      </Panel>
      <Table head={["Code", "Discount", "Min order", "Expires", "Used", "Status", ""]} empty={!data?.length}>
        {(data ?? []).map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-semibold">{c.code}</td>
            <td className="px-4 py-3">{c.discount_type === "percent" ? `${c.value}%` : formatINR(c.value)}{c.max_discount && ` (max ${formatINR(c.max_discount)})`}</td>
            <td className="px-4 py-3">{formatINR(c.min_amount)}</td>
            <td className="px-4 py-3 text-xs">{c.expires_at ? formatDate(c.expires_at) : "Never"}</td>
            <td className="px-4 py-3">{c.used_count}{c.usage_limit && ` / ${c.usage_limit}`}</td>
            <td className="px-4 py-3 text-xs">{c.is_active ? "Active" : "Inactive"}</td>
            <td className="px-4 py-3">
              <form action={toggleCoupon}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={String(!c.is_active)} />
                <button className="text-xs underline">{c.is_active ? "Deactivate" : "Activate"}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
