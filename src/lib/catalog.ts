import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Gender, ProductWithRelations, Review, SiteSettings } from "@/lib/types";

export const PRODUCT_SELECT =
  "*, category:categories(id,name,slug,gender), images:product_images(*), variants:product_variants(*)";

export const PAGE_SIZE = 12;

export const SORTS = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  best: "Best Selling",
} as const;
export type SortKey = keyof typeof SORTS;

export interface ProductFilters {
  q?: string;
  gender?: Gender;
  category?: string; // slug
  min?: number;
  max?: number;
  inStock?: boolean;
  size?: string;
  material?: string;
  metal?: string;
  finish?: string;
  sort?: SortKey;
  page?: number;
}

/** Sort images primary-first and variants by sort order so components don't have to. */
export function normalizeProduct(p: ProductWithRelations): ProductWithRelations {
  return {
    ...p,
    price: Number(p.price),
    compare_at_price: p.compare_at_price === null ? null : Number(p.compare_at_price),
    images: [...(p.images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order),
    variants: [...(p.variants ?? [])]
      .filter((v) => v.is_active)
      .map((v) => ({ ...v, price: v.price === null ? null : Number(v.price) }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

export const getSettings = cache(async (): Promise<SiteSettings | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return data as SiteSettings | null;
});

export const getCategories = cache(async (gender?: Gender): Promise<Category[]> => {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  if (gender) query = query.eq("gender", gender);
  const { data } = await query;
  return (data ?? []) as Category[];
});

/** Strip PostgREST filter syntax characters from user search text. */
function cleanTerm(q: string) {
  return q.replace(/[%,()*:\\."']/g, " ").trim().slice(0, 60);
}

export async function listProducts(f: ProductFilters) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  const select = f.size
    ? PRODUCT_SELECT.replace("variants:product_variants(*)", "variants:product_variants!inner(*)")
    : PRODUCT_SELECT;
  let query = supabase.from("products").select(select, { count: "exact" }).eq("is_active", true).eq("is_archived", false);

  if (f.gender) query = query.eq("gender", f.gender);
  if (f.category) {
    let catQuery = supabase.from("categories").select("id").eq("slug", f.category);
    if (f.gender) catQuery = catQuery.eq("gender", f.gender);
    const { data: cats } = await catQuery;
    const ids = (cats ?? []).map((c) => c.id as string);
    if (!ids.length) return { products: [], total: 0, page, pages: 0 };
    query = query.in("category_id", ids);
  }
  if (f.q) {
    const term = cleanTerm(f.q);
    if (term) {
      const { data: cats } = await supabase.from("categories").select("id").ilike("name", `%${term}%`);
      const ors = [
        `name.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `short_description.ilike.%${term}%`,
        `sku.ilike.%${term}%`,
        `material.ilike.%${term}%`,
        `metal.ilike.%${term}%`,
        `tags.cs.{${term.toLowerCase()}}`,
      ];
      const catIds = (cats ?? []).map((c) => c.id as string);
      if (catIds.length) ors.push(`category_id.in.(${catIds.join(",")})`);
      const g = term.toLowerCase();
      if (["men", "man", "mens", "male"].includes(g)) ors.push("gender.eq.men");
      if (["women", "woman", "womens", "female", "ladies"].includes(g)) ors.push("gender.eq.women");
      query = query.or(ors.join(","));
    }
  }
  if (f.min !== undefined) query = query.gte("price", f.min);
  if (f.max !== undefined) query = query.lte("price", f.max);
  if (f.inStock) query = query.gt("stock", 0);
  if (f.material) query = query.eq("material", f.material);
  if (f.metal) query = query.eq("metal", f.metal);
  if (f.finish) query = query.eq("finish", f.finish);
  if (f.size) query = query.eq("product_variants.name", f.size).eq("product_variants.is_active", true);

  switch (f.sort) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "best":
      query = query.order("sold_count", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    products: ((data ?? []) as unknown as ProductWithRelations[]).map(normalizeProduct),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function listFlagged(flag: "is_featured" | "is_new" | "is_bestseller" | "trending", limit = 8) {
  const supabase = await createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true).eq("is_archived", false).limit(limit);
  query = flag === "trending" ? query.order("sold_count", { ascending: false }).order("updated_at", { ascending: false }) : query.eq(flag, true).order("created_at", { ascending: false });
  const { data } = await query;
  return ((data ?? []) as unknown as ProductWithRelations[]).map(normalizeProduct);
}

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("is_active", true).eq("is_archived", false).maybeSingle();
  return data ? normalizeProduct(data as unknown as ProductWithRelations) : null;
});

export async function getRelated(product: ProductWithRelations, limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_archived", false)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(limit);
  return ((data ?? []) as unknown as ProductWithRelations[]).map(normalizeProduct);
}

export async function getReviews(productId?: string, limit = 20) {
  const supabase = await createClient();
  let query = supabase.from("reviews").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(limit);
  if (productId) query = query.eq("product_id", productId);
  const { data } = await query;
  return (data ?? []) as Review[];
}

/** Distinct filter values present in active products. */
export async function getFilterOptions(gender?: Gender) {
  const supabase = await createClient();
  let query = supabase.from("products").select("material,metal,finish,variants:product_variants(name)").eq("is_active", true).eq("is_archived", false).limit(500);
  if (gender) query = query.eq("gender", gender);
  const { data } = await query;
  const rows = (data ?? []) as { material: string | null; metal: string | null; finish: string | null; variants: { name: string }[] }[];
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();
  return {
    materials: uniq(rows.map((r) => r.material)),
    metals: uniq(rows.map((r) => r.metal)),
    finishes: uniq(rows.map((r) => r.finish)),
    sizes: uniq(rows.flatMap((r) => r.variants.map((v) => v.name))),
  };
}
