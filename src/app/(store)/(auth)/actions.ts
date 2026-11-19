"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

/** Only allow same-site relative redirects. */
function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
}

const email = z.email().max(200);
const password = z.string().min(8, "Password must be at least 8 characters.").max(72);

export async function signIn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({ email, password: z.string().min(1) }).safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: "Please enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message === "Email not confirmed" ? "Please verify your email first — check your inbox." : "Incorrect email or password." };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ full_name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).optional(), email, password })
    .safeParse({ full_name: fd.get("full_name"), phone: fd.get("phone") || undefined, email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name, phone: parsed.data.phone ?? null }, emailRedirectTo: `${siteUrl()}/auth/callback?next=/account` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Almost there! We've sent a verification link to your email." };
}

export async function forgotPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = email.safeParse(fd.get("email"));
  if (!parsed.success) return { ok: false, error: "Please enter a valid email." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  // Same response whether or not the account exists.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = password.safeParse(fd.get("password"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  if (fd.get("password") !== fd.get("confirm")) return { ok: false, error: "Passwords do not match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { ok: false, error: "Your reset link has expired. Please request a new one." };
  redirect("/account?reset=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
