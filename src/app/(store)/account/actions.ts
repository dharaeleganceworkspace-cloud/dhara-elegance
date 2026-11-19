"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function updateProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const parsed = z
    .object({ full_name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).regex(/^[+\d\s()-]*$/) })
    .safeParse({ full_name: fd.get("full_name"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { ok: false, error: "Please check your name and phone number." };
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null }).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save your profile." };
  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

const addressSchema = z.object({
  id: z.uuid().optional(),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20).regex(/^[+\d\s()-]+$/),
  line1: z.string().trim().min(5).max(300),
  landmark: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[0-9A-Za-z -]{4,10}$/),
  country: z.string().trim().min(2).max(60),
  is_default: z.boolean(),
});

export async function saveAddress(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const raw = Object.fromEntries(fd);
  const parsed = addressSchema.safeParse({ ...raw, id: raw.id || undefined, landmark: raw.landmark || undefined, is_default: raw.is_default === "on" });
  if (!parsed.success) return { ok: false, error: "Please check the address fields." };
  const { id, ...values } = parsed.data;
  if (values.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = id
    ? await supabase.from("addresses").update(values).eq("id", id).eq("user_id", user.id)
    : await supabase.from("addresses").insert({ ...values, user_id: user.id });
  if (error) return { ok: false, error: "Could not save the address." };
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(fd: FormData) {
  const { supabase, user } = await getUser();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!user || !id.success) return;
  await supabase.from("addresses").delete().eq("id", id.data).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}

export async function requestReturn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const parsed = z
    .object({ order_id: z.uuid(), request_type: z.enum(["return", "exchange"]), reason: z.string().trim().min(5).max(1000) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Please describe the reason (at least 5 characters)." };
  // RLS only allows this for the customer's own delivered orders.
  const { error } = await supabase.from("return_requests").insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: "Returns and exchanges can be requested for delivered orders only." };
  revalidatePath(`/account/orders/${parsed.data.order_id}`);
  return { ok: true, message: "Request sent. Our team will contact you on WhatsApp." };
}
