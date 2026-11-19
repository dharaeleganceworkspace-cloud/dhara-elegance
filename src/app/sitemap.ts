import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/format";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = ["", "/women", "/men", "/search", "/about"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily", priority: p ? 0.8 : 1 }));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return pages;
  // Cookie-less client: the sitemap only lists public products.
  const { data } = await createClient(url, key).from("products").select("slug,updated_at").eq("is_active", true).eq("is_archived", false).limit(5000);
  return [...pages, ...(data ?? []).map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updated_at as string, priority: 0.7 }))];
}
