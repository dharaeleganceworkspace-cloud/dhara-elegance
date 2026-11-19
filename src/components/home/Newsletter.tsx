"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Newsletter({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("busy");
    const { error } = await createClient().from("newsletter_subscribers").insert({ email: email.trim().toLowerCase() });
    // A duplicate email means they are already subscribed.
    setState(!error || error.code === "23505" ? "done" : "error");
  };

  if (state === "done") return <p className={`text-sm ${dark ? "text-gold" : "text-navy"}`}>Thank you — you&apos;re on the list.</p>;

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        aria-label="Email address"
        className={dark ? "w-full border-b border-cream/30 bg-transparent py-3 text-sm text-cream outline-none placeholder:text-cream/40 focus:border-gold" : "input"}
      />
      <button disabled={state === "busy"} className="btn-gold shrink-0">Subscribe</button>
      {state === "error" && <p className="text-xs text-red-400">Please enter a valid email.</p>}
    </form>
  );
}
