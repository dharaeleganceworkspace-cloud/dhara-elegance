"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  dark = false,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  fields: AuthField[];
  submitLabel: string;
  hidden?: Record<string, string>;
  dark?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok && state.message) return <p className={`p-4 text-sm ${dark ? "bg-gold/10 text-gold-light" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>;
  return (
    <form action={formAction} className="space-y-5">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className={`label ${dark ? "text-cream/70" : ""}`}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} required={f.required ?? true} autoComplete={f.autoComplete} className="input" />
        </div>
      ))}
      {state && !state.ok && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={`${dark ? "btn-gold" : "btn-navy"} w-full py-4`}>{pending ? "Please wait…" : submitLabel}</button>
    </form>
  );
}
