import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../ProductForm";
import type { Category } from "@/lib/types";

export const metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("gender").order("sort_order");
  return (
    <>
      <Link href="/admin/products" className="text-xs text-ink/50 hover:text-gold">← Products</Link>
      <PageHeader title="Add product" subtitle="Images can be uploaded after the product is created." />
      <ProductForm categories={(data ?? []) as Category[]} />
    </>
  );
}
