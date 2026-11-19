import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/ActionForm";
import { saveCategory } from "../../actions";
import type { Category } from "@/lib/types";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("gender").order("sort_order");
  const cats = (data ?? []) as Category[];

  const row = (c?: Category) => (
    <ActionForm action={saveCategory} submitLabel={c ? "Save" : "Add category"} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[2fr_1fr_0.7fr_auto_auto]" buttonClassName="border border-navy/30 px-3 py-2 text-xs">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <label><span className="label">Name</span><input name="name" defaultValue={c?.name} required className="input py-2" /></label>
      <label><span className="label">Gender</span>
        <select name="gender" defaultValue={c?.gender ?? "women"} className="input py-2"><option value="women">Women</option><option value="men">Men</option></select>
      </label>
      <label><span className="label">Order</span><input name="sort_order" type="number" min={0} defaultValue={c?.sort_order ?? 0} className="input py-2" /></label>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? true} className="accent-gold" /> Active</label>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title="Categories" subtitle="Men and Women categories are kept separate. Inactive categories are hidden from the store." />
      <div className="grid gap-6 xl:grid-cols-2">
        {(["women", "men"] as const).map((g) => (
          <Panel key={g} title={g === "men" ? "Men" : "Women"}>
            <div className="space-y-4">{cats.filter((c) => c.gender === g).map((c) => <div key={c.id}>{row(c)}</div>)}</div>
          </Panel>
        ))}
      </div>
      <Panel title="Add category" className="mt-6">{row()}</Panel>
    </>
  );
}
