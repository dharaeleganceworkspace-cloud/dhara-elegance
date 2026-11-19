"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import type { ActionResult } from "@/lib/types";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" defaultValue={fullName} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (WhatsApp)</label>
        <input id="phone" name="phone" type="tel" defaultValue={phone} className="input" />
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</p>}
      <button disabled={pending} className="btn-navy">Save profile</button>
    </form>
  );
}
