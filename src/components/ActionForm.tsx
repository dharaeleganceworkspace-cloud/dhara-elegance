"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";

/** A form bound to a server action that returns ActionResult; shows the result message below. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-4",
  buttonClassName = "btn-navy",
  hideOnSuccess = false,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (hideOnSuccess && state?.ok) return <p className="text-sm text-emerald-700">{state.message}</p>;
  return (
    <form action={formAction} className={className}>
      {children}
      {state && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</p>}
      <button disabled={pending} className={buttonClassName}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}
