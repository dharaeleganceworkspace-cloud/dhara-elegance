import { requireAdmin } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/ActionForm";
import { saveSettings } from "../../actions";
import type { SiteSettings } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const s = data as SiteSettings | null;

  return (
    <>
      <PageHeader title="Settings" />
      <ActionForm action={saveSettings} submitLabel="Save settings" className="max-w-3xl space-y-6">
        <Panel title="WhatsApp">
          {!s?.business_whatsapp && <p className="mb-4 bg-amber-50 p-3 text-sm text-amber-900">No business WhatsApp number yet — customers cannot place orders until you add one.</p>}
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <label><span className="label">Country code</span><input name="whatsapp_country_code" defaultValue={s?.whatsapp_country_code ?? "91"} required className="input" inputMode="numeric" /></label>
            <label><span className="label">Business WhatsApp number (receives orders)</span><input name="business_whatsapp" defaultValue={s?.business_whatsapp ? `+${s.business_whatsapp}` : ""} required className="input" placeholder="+91 98765 43210" /></label>
            <span />
            <label><span className="label">Support WhatsApp number (optional)</span><input name="support_whatsapp" defaultValue={s?.support_whatsapp ? `+${s.support_whatsapp}` : ""} className="input" /></label>
          </div>
          <p className="mt-3 text-xs text-ink/55">Stored as digits with country code (no +, spaces or dashes). New orders use the new number; existing orders keep the number they were placed with.</p>
        </Panel>
        <Panel title="Shipping">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Shipping charge (₹)</span><input name="shipping_fee" type="number" min={0} step="0.01" defaultValue={s?.shipping_fee ?? 0} className="input" /></label>
            <label><span className="label">Free shipping from (₹, blank = never)</span><input name="free_shipping_min" type="number" min={0} step="0.01" defaultValue={s?.free_shipping_min ?? ""} className="input" /></label>
          </div>
        </Panel>
        <Panel title="Storefront">
          <label className="block"><span className="label">Announcement bar</span><input name="announcement" defaultValue={s?.announcement ?? ""} maxLength={200} className="input" /></label>
          <label className="mt-4 block"><span className="label">Instagram handle</span><input name="instagram_handle" defaultValue={s?.instagram_handle ?? ""} className="input" placeholder="@dharaelegance" /></label>
        </Panel>
      </ActionForm>
    </>
  );
}
