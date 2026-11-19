"use server";

import { z } from "zod";
import { getUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  product_id: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});

export async function submitReview(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check your review and try again." };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.product_id,
    user_id: user.id,
    author_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body || null,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "You have already reviewed this product." : "Could not save your review." };
  return { ok: true, message: "Thank you! Your review will appear once approved." };
}
