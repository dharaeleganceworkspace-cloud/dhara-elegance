"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, getAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { ORDER_STATUSES, type ActionResult } from "@/lib/types";

const DENIED: ActionResult = { ok: false, error: "You are not authorized to do this." };
const BUCKET = "product-images";

function refreshStore() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- auth

export async function adminSignIn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "Incorrect email or password." };
  if (!(await getAdmin())) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have admin access." };
  }
  redirect("/admin/dashboard");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- products

const money = z.coerce.number().min(0, "Prices cannot be negative.").max(10_000_000);
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const variantSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(40),
  sku: z.string().trim().max(60).optional(),
  price: z.union([z.literal(""), z.null(), money]).optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  is_active: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().max(160).optional(),
  description: optText(5000),
  short_description: optText(300),
  gender: z.enum(["men", "women"]),
  category_id: z.uuid(),
  subcategory: optText(80),
  price: money,
  compare_at_price: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
  sku: optText(60),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  low_stock_threshold: z.coerce.number().int().min(0).max(10000),
  material: optText(80),
  metal: optText(80),
  finish: optText(80),
  color: optText(80),
  tags: z.string().max(500).transform((v) => [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30)),
  seo_title: optText(120),
  seo_description: optText(300),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_new: z.boolean(),
  is_bestseller: z.boolean(),
});

export async function saveProduct(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const { supabase, user } = admin;
  const id = z.uuid().safeParse(fd.get("id")).data;
  const raw = Object.fromEntries(fd);
  const parsed = productSchema.safeParse({
    ...raw,
    is_active: raw.is_active === "on",
    is_featured: raw.is_featured === "on",
    is_new: raw.is_new === "on",
    is_bestseller: raw.is_bestseller === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join("; ") };

  let variants: z.infer<typeof variantSchema>[] = [];
  try {
    const v = z.array(variantSchema).max(50).safeParse(JSON.parse(String(fd.get("variants") ?? "[]")));
    if (!v.success) return { ok: false, error: "Sizes: " + v.error.issues[0]?.message };
    variants = v.data;
  } catch {
    return { ok: false, error: "Invalid sizes data." };
  }
  if (new Set(variants.map((v) => v.name.toLowerCase())).size !== variants.length) return { ok: false, error: "Each size must have a unique name." };

  const p = parsed.data;
  const { data: cat } = await supabase.from("categories").select("gender").eq("id", p.category_id).maybeSingle();
  if (!cat || cat.gender !== p.gender) return { ok: false, error: "The category does not belong to the selected gender." };
  if (p.compare_at_price !== null && p.compare_at_price < p.price) return { ok: false, error: "Compare-at price should be higher than the price." };

  const values = { ...p, slug: slugify(p.slug || p.name) };
  const hasVariants = variants.some((v) => v.is_active);
  let productId = id;
  let before: Record<string, unknown> | null = null;

  if (id) {
    const { data: prev } = await supabase.from("products").select("price,stock,is_active").eq("id", id).maybeSingle();
    before = prev;
    // Stock for products with sizes is the sum of the sizes; direct stock edits go through inventory adjustments.
    const { stock, ...rest } = values;
    const { error } = await supabase.from("products").update(hasVariants ? rest : { ...rest, stock }).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "That slug or SKU is already used." : error.message };
    if (!hasVariants && prev && prev.stock !== stock) {
      await supabase.from("inventory_transactions").insert({ product_id: id, change: stock - prev.stock, reason: "adjustment", note: "Edited on product form", created_by: user.id });
    }
  } else {
    const { data, error } = await supabase.from("products").insert(values).select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "That slug or SKU is already used." : error.message };
    productId = data.id as string;
    if (!hasVariants && values.stock > 0) {
      await supabase.from("inventory_transactions").insert({ product_id: productId, change: values.stock, reason: "initial", created_by: user.id });
    }
  }

  // Sync variants: update existing, insert new, deactivate removed (keeps order history intact).
  const { data: existing } = await supabase.from("product_variants").select("id,stock").eq("product_id", productId!);
  const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
  for (const old of existing ?? []) {
    if (!keep.has(old.id)) await supabase.from("product_variants").update({ is_active: false }).eq("id", old.id);
  }
  for (const [i, v] of variants.entries()) {
    const row = { name: v.name, sku: v.sku || null, price: v.price === "" || v.price == null ? null : v.price, stock: v.stock, is_active: v.is_active, sort_order: i };
    const prev = existing?.find((e) => e.id === v.id);
    const { error } = prev
      ? await supabase.from("product_variants").update(row).eq("id", prev.id)
      : await supabase.from("product_variants").insert({ ...row, product_id: productId });
    if (error) return { ok: false, error: `Size "${v.name}": ${error.code === "23505" ? "name or SKU already used" : error.message}` };
    const delta = v.stock - (prev?.stock ?? 0);
    if (delta !== 0) {
      await supabase.from("inventory_transactions").insert({ product_id: productId, variant_id: prev?.id ?? null, change: delta, reason: prev ? "adjustment" : "initial", note: `Size ${v.name}`, created_by: user.id });
    }
  }

  await audit(supabase, user.id, id ? "product.update" : "product.create", "product", productId!, {
    name: p.name,
    ...(before && before.price !== undefined && Number(before.price) !== p.price ? { price_from: before.price, price_to: p.price } : {}),
  });
  refreshStore();
  if (!id) redirect(`/admin/products/${productId}/edit?created=1`);
  return { ok: true, message: "Product saved. The storefront now shows these details." };
}

export async function setProductState(fd: FormData) {
  const admin = await getAdmin();
  if (!admin) return;
  const id = z.uuid().parse(fd.get("id"));
  const op = z.enum(["activate", "deactivate", "archive", "unarchive", "delete"]).parse(fd.get("op"));
  const { supabase, user } = admin;
  if (op === "delete") {
    // Products with orders are archived instead so order history keeps its links.
    const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (count) {
      await supabase.from("products").update({ is_archived: true, is_active: false }).eq("id", id);
      await audit(supabase, user.id, "product.archive", "product", id, { reason: "delete requested; product has orders" });
    } else {
      const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
      if (imgs?.length) await supabase.storage.from(BUCKET).remove(imgs.map((i) => i.storage_path));
      await supabase.from("products").delete().eq("id", id);
      await audit(supabase, user.id, "product.delete", "product", id);
    }
    refreshStore();
    redirect("/admin/products");
  }
  const patch = {
    activate: { is_active: true },
    deactivate: { is_active: false },
    archive: { is_archived: true, is_active: false },
    unarchive: { is_archived: false },
  }[op];
  await supabase.from("products").update(patch).eq("id", id);
  await audit(supabase, user.id, `product.${op}`, "product", id);
  refreshStore();
}

// ---------------------------------------------------------------- images

const pathFor = (productId: string) => z.string().regex(new RegExp(`^${productId}/[A-Za-z0-9._-]+$`));

export async function addProductImage(productId: string, storagePath: string, alt: string | null): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  if (!z.uuid().safeParse(productId).success || !pathFor(productId).safeParse(storagePath).success) return { ok: false, error: "Invalid image path." };
  const { supabase, user } = admin;
  const url = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { data: imgs } = await supabase.from("product_images").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    url,
    alt_text: alt?.slice(0, 200) || null,
    sort_order: (imgs?.[0]?.sort_order ?? -1) + 1,
    is_primary: !imgs?.length,
  });
  if (error) return { ok: false, error: error.message };
  await audit(supabase, user.id, "image.upload", "product", productId, { path: storagePath });
  refreshStore();
  return { ok: true };
}

export async function replaceProductImage(imageId: string, storagePath: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const { supabase, user } = admin;
  const { data: img } = await supabase.from("product_images").select("product_id,storage_path").eq("id", imageId).maybeSingle();
  if (!img || !pathFor(img.product_id).safeParse(storagePath).success) return { ok: false, error: "Invalid image." };
  const url = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { error } = await supabase.from("product_images").update({ storage_path: storagePath, url }).eq("id", imageId);
  if (error) return { ok: false, error: error.message };
  await supabase.storage.from(BUCKET).remove([img.storage_path]);
  await audit(supabase, user.id, "image.replace", "product", img.product_id, { image_id: imageId });
  refreshStore();
  return { ok: true };
}

export async function updateProductImage(imageId: string, op: "primary" | "delete" | "alt", alt?: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const { supabase, user } = admin;
  const { data: img } = await supabase.from("product_images").select("product_id,storage_path,is_primary").eq("id", imageId).maybeSingle();
  if (!img) return { ok: false, error: "Image not found." };
  if (op === "primary") {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", img.product_id);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  } else if (op === "alt") {
    await supabase.from("product_images").update({ alt_text: (alt ?? "").trim().slice(0, 200) || null }).eq("id", imageId);
  } else {
    await supabase.from("product_images").delete().eq("id", imageId);
    await supabase.storage.from(BUCKET).remove([img.storage_path]);
    if (img.is_primary) {
      const { data: next } = await supabase.from("product_images").select("id").eq("product_id", img.product_id).order("sort_order").limit(1);
      if (next?.[0]) await supabase.from("product_images").update({ is_primary: true }).eq("id", next[0].id);
    }
  }
  await audit(supabase, user.id, `image.${op}`, "product", img.product_id, { image_id: imageId });
  refreshStore();
  return { ok: true };
}

export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const ids = z.array(z.uuid()).max(50).safeParse(orderedIds);
  if (!ids.success) return { ok: false, error: "Invalid order." };
  await Promise.all(ids.data.map((id, i) => admin.supabase.from("product_images").update({ sort_order: i }).eq("id", id).eq("product_id", productId)));
  refreshStore();
  return { ok: true };
}

// ---------------------------------------------------------------- orders

export async function setOrderStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z.object({ id: z.uuid(), status: z.enum(ORDER_STATUSES), note: z.string().max(500).optional() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  const { error } = await admin.supabase.rpc("admin_set_order_status", { p_order_id: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note ?? null });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  refreshStore();
  return { ok: true, message: "Order status updated." };
}

export async function addOrderNote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z.object({ id: z.uuid(), note: z.string().trim().min(1).max(2000) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Write a note first." };
  const { supabase, user } = admin;
  const { error } = await supabase.from("order_notes").insert({ order_id: parsed.data.id, note: parsed.data.note, created_by: user.id });
  if (error) return { ok: false, error: error.message };
  await audit(supabase, user.id, "order.note", "order", parsed.data.id);
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  return { ok: true, message: "Note added." };
}

// ---------------------------------------------------------------- inventory

export async function adjustStock(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({ product_id: z.uuid(), variant_id: z.union([z.literal(""), z.uuid()]), change: z.coerce.number().int().min(-100000).max(100000), note: z.string().trim().max(300) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success || parsed.data.change === 0) return { ok: false, error: "Enter a non-zero whole number." };
  const { error } = await admin.supabase.rpc("admin_adjust_stock", {
    p_product_id: parsed.data.product_id,
    p_variant_id: parsed.data.variant_id || null,
    p_change: parsed.data.change,
    p_note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: error.message.includes("check constraint") ? "Stock cannot go below zero." : error.message };
  revalidatePath("/admin/inventory");
  refreshStore();
  return { ok: true, message: "Stock updated." };
}

// ---------------------------------------------------------------- categories

export async function saveCategory(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({
      id: z.union([z.literal(""), z.uuid()]),
      name: z.string().trim().min(2).max(60),
      gender: z.enum(["men", "women"]),
      sort_order: z.coerce.number().int().min(0).max(1000),
      is_active: z.boolean(),
    })
    .safeParse({ ...Object.fromEntries(fd), is_active: fd.get("is_active") === "on" });
  if (!parsed.success) return { ok: false, error: "Check the category fields." };
  const { id, ...v } = parsed.data;
  const row = { ...v, slug: slugify(v.name) };
  const { supabase, user } = admin;
  const { error } = id ? await supabase.from("categories").update(row).eq("id", id) : await supabase.from("categories").insert(row);
  if (error) return { ok: false, error: error.code === "23505" ? `A ${v.gender} category with that name already exists.` : error.message };
  await audit(supabase, user.id, id ? "category.update" : "category.create", "category", id || null, row);
  refreshStore();
  return { ok: true, message: "Category saved." };
}

// ---------------------------------------------------------------- settings

export async function saveSettings(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const cc = String(fd.get("whatsapp_country_code") ?? "").replace(/\D/g, "");
  if (!/^[1-9]\d{0,3}$/.test(cc)) return { ok: false, error: "Country code must be 1–4 digits, e.g. 91." };
  const business = normalizeWhatsAppNumber(String(fd.get("business_whatsapp") ?? ""), cc);
  if (!business) return { ok: false, error: "Business WhatsApp number is not valid. Use the full number, e.g. 9876543210 or +91 98765 43210." };
  const supportRaw = String(fd.get("support_whatsapp") ?? "").trim();
  const support = supportRaw ? normalizeWhatsAppNumber(supportRaw, cc) : null;
  if (supportRaw && !support) return { ok: false, error: "Support WhatsApp number is not valid." };

  const parsed = z
    .object({
      shipping_fee: money,
      free_shipping_min: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
      announcement: optText(200),
      instagram_handle: optText(60),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Check shipping and other fields." };

  const { supabase, user } = admin;
  const { data: prev } = await supabase.from("site_settings").select("business_whatsapp,support_whatsapp").eq("id", 1).maybeSingle();
  const { error } = await supabase
    .from("site_settings")
    .update({ ...parsed.data, business_whatsapp: business, support_whatsapp: support, whatsapp_country_code: cc, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  await audit(supabase, user.id, "settings.update", "site_settings", "1", { business_whatsapp_from: prev?.business_whatsapp, business_whatsapp_to: business, support_whatsapp: support });
  refreshStore();
  return { ok: true, message: `Saved. New orders will go to WhatsApp +${business}.` };
}

// ---------------------------------------------------------------- coupons, reviews, returns

export async function saveCoupon(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3–30 letters/numbers"),
      discount_type: z.enum(["fixed", "percent"]),
      value: z.coerce.number().positive(),
      min_amount: money,
      max_discount: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
      expires_at: z.string().transform((v) => (v ? new Date(v).toISOString() : null)),
      usage_limit: z.union([z.literal(""), z.coerce.number().int().positive()]).transform((v) => (v === "" ? null : v)),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the coupon fields." };
  if (parsed.data.discount_type === "percent" && parsed.data.value > 100) return { ok: false, error: "Percentage cannot exceed 100." };
  const { supabase, user } = admin;
  const { error } = await supabase.from("coupons").insert(parsed.data);
  if (error) return { ok: false, error: error.code === "23505" ? "That code already exists." : error.message };
  await audit(supabase, user.id, "coupon.create", "coupon", parsed.data.code);
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Coupon created." };
}

export async function toggleCoupon(fd: FormData) {
  const admin = await getAdmin();
  if (!admin) return;
  const id = z.uuid().parse(fd.get("id"));
  const active = fd.get("active") === "true";
  await admin.supabase.from("coupons").update({ is_active: active }).eq("id", id);
  await audit(admin.supabase, admin.user.id, active ? "coupon.activate" : "coupon.deactivate", "coupon", id);
  revalidatePath("/admin/coupons");
}

export async function moderateReview(fd: FormData) {
  const admin = await getAdmin();
  if (!admin) return;
  const id = z.uuid().parse(fd.get("id"));
  const op = z.enum(["approved", "hidden", "delete"]).parse(fd.get("op"));
  const { supabase, user } = admin;
  if (op === "delete") await supabase.from("reviews").delete().eq("id", id);
  else await supabase.from("reviews").update({ status: op }).eq("id", id);
  await audit(supabase, user.id, `review.${op}`, "review", id);
  revalidatePath("/admin/reviews");
  refreshStore();
}

export async function updateReturn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["requested", "approved", "rejected", "completed"]), admin_note: z.string().trim().max(1000) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { supabase, user } = admin;
  const { error } = await supabase.from("return_requests").update({ status: parsed.data.status, admin_note: parsed.data.admin_note || null }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  await audit(supabase, user.id, "return.update", "return_request", parsed.data.id, { status: parsed.data.status });
  revalidatePath("/admin/returns");
  return { ok: true, message: "Saved." };
}
