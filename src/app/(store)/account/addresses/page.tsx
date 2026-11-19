import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { deleteAddress, saveAddress } from "../actions";
import type { Address } from "@/lib/types";

export default async function AddressesPage() {
  const { supabase, user } = await requireUser("/account/addresses");
  const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at");
  const addresses = (data ?? []) as Address[];

  return (
    <div className="space-y-10">
      <h2 className="heading-lux text-3xl text-navy">Addresses</h2>
      {addresses.map((a) => (
        <details key={a.id} className="bg-white p-5">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <strong className="text-navy">{a.full_name}</strong> · {a.line1}, {a.city} {a.pincode}
              {a.is_default && <span className="ml-2 bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-navy uppercase">Default</span>}
            </span>
            <span className="text-xs text-gold">Edit</span>
          </summary>
          <div className="mt-5">
            <AddressFields address={a} />
            <form action={deleteAddress} className="mt-3">
              <input type="hidden" name="id" value={a.id} />
              <button className="text-xs text-red-700 hover:underline">Delete address</button>
            </form>
          </div>
        </details>
      ))}
      <div className="bg-white p-6">
        <p className="heading-lux mb-4 text-xl text-navy">Add a new address</p>
        <AddressFields />
      </div>
    </div>
  );
}

function AddressFields({ address }: { address?: Address }) {
  const f = (name: keyof Address, label: string, required = true) => (
    <div>
      <label className="label" htmlFor={`${address?.id ?? "new"}-${name}`}>{label}</label>
      <input id={`${address?.id ?? "new"}-${name}`} name={name} required={required} defaultValue={address ? String(address[name] ?? "") : name === "country" ? "India" : ""} className="input" />
    </div>
  );
  return (
    <ActionForm action={saveAddress} submitLabel="Save address" className="grid gap-4 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      {f("full_name", "Full name")}
      {f("phone", "Phone")}
      <div className="sm:col-span-2">{f("line1", "Address")}</div>
      {f("landmark", "Landmark (optional)", false)}
      {f("city", "City")}
      {f("state", "State")}
      {f("pincode", "PIN code")}
      {f("country", "Country")}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_default" defaultChecked={address?.is_default} className="accent-gold" /> Use as default address
      </label>
    </ActionForm>
  );
}
