"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "../../actions";
import type { ActionResult, Category, Product, ProductVariant } from "@/lib/types";

type VariantRow = { id?: string; name: string; sku: string; price: string; stock: string; is_active: boolean };

export function ProductForm({ product, variants = [], categories }: { product?: Product; variants?: ProductVariant[]; categories: Category[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProduct, null);
  const [gender, setGender] = useState(product?.gender ?? "women");
  const [rows, setRows] = useState<VariantRow[]>(
    variants.filter((v) => v.is_active).map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? "", price: v.price === null ? "" : String(v.price), stock: String(v.stock), is_active: v.is_active })),
  );
  const hasSizes = rows.length > 0;
  const cats = categories.filter((c) => c.gender === gender);
  const setRow = (i: number, patch: Partial<VariantRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(rows.map((r) => ({ ...r, stock: Number(r.stock) || 0, price: r.price === "" ? "" : Number(r.price) })))} />

      <Section title="Basics">
        <Field name="name" label="Product name" required defaultValue={product?.name} />
        <Field name="slug" label="URL slug (auto from name if blank)" defaultValue={product?.slug} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="gender">Gender</label>
            <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value as "men" | "women")} className="input">
              <option value="women">Women</option>
              <option value="men">Men</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="category_id">Category</label>
            <select id="category_id" name="category_id" key={gender} defaultValue={product?.gender === gender ? product.category_id : cats[0]?.id} required className="input">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field name="subcategory" label="Subcategory" defaultValue={product?.subcategory ?? ""} />
        </div>
        <Field name="short_description" label="Short description" defaultValue={product?.short_description ?? ""} maxLength={300} />
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} defaultValue={product?.description ?? ""} maxLength={5000} className="input" />
        </div>
      </Section>

      <Section title="Pricing & stock">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field name="price" label="Price (₹)" type="number" min={0} step="0.01" required defaultValue={product?.price} />
          <Field name="compare_at_price" label="Compare-at price (₹)" type="number" min={0} step="0.01" defaultValue={product?.compare_at_price ?? ""} />
          <Field name="sku" label="SKU" defaultValue={product?.sku ?? ""} />
          <Field name="low_stock_threshold" label="Low-stock threshold" type="number" min={0} defaultValue={product?.low_stock_threshold ?? 5} />
        </div>
        <Field
          name="stock"
          label={hasSizes ? "Stock (sum of sizes — edit per size below)" : "Stock"}
          type="number"
          min={0}
          key={String(hasSizes)}
          {...(hasSizes
            ? { readOnly: true, value: rows.reduce((s, r) => s + (Number(r.stock) || 0), 0) }
            : { defaultValue: product?.stock ?? 0 })}
        />
      </Section>

      <Section title="Sizes / variants">
        <p className="text-xs text-ink/55">Add sizes (e.g. 6, 7, 8 or 18 inch). Each size has its own stock; leave price blank to use the product price.</p>
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Field label="Size" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} required />
            <Field label="SKU" value={r.sku} onChange={(e) => setRow(i, { sku: e.target.value })} />
            <Field label="Price (optional)" type="number" min={0} step="0.01" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
            <Field label="Stock" type="number" min={0} value={r.stock} onChange={(e) => setRow(i, { stock: e.target.value })} required />
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="h-11 px-3 text-xs text-red-700">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, { name: "", sku: "", price: "", stock: "0", is_active: true }])} className="btn-outline py-2 text-navy">+ Add size</button>
      </Section>

      <Section title="Attributes">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field name="material" label="Material" defaultValue={product?.material ?? ""} placeholder="Stainless steel" />
          <Field name="metal" label="Metal" defaultValue={product?.metal ?? ""} placeholder="18K gold plated" />
          <Field name="finish" label="Finish" defaultValue={product?.finish ?? ""} placeholder="Polished" />
          <Field name="color" label="Colour" defaultValue={product?.color ?? ""} placeholder="Gold" />
        </div>
        <Field name="tags" label="Tags (comma separated)" defaultValue={product?.tags.join(", ") ?? ""} placeholder="minimal, daily wear, gift" />
      </Section>

      <Section title="Visibility">
        <div className="flex flex-wrap gap-6 text-sm">
          {(
            [
              ["is_active", "Active (visible & purchasable)", product?.is_active ?? true],
              ["is_featured", "Featured", product?.is_featured ?? false],
              ["is_new", "New arrival", product?.is_new ?? false],
              ["is_bestseller", "Bestseller", product?.is_bestseller ?? false],
            ] as const
          ).map(([name, label, checked]) => (
            <label key={name} className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={checked} className="accent-gold" /> {label}</label>
          ))}
        </div>
      </Section>

      <Section title="SEO">
        <Field name="seo_title" label="SEO title" defaultValue={product?.seo_title ?? ""} maxLength={120} />
        <Field name="seo_description" label="SEO description" defaultValue={product?.seo_description ?? ""} maxLength={300} />
      </Section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-navy/10 bg-[#f4f2ee]/95 py-4 backdrop-blur">
        <button disabled={pending} className="btn-navy">{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button>
        {state && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.ok ? state.message : state.error}</p>}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 bg-white p-5 shadow-sm sm:p-6">
      <legend className="float-left mb-2 w-full text-xs font-bold tracking-[0.2em] text-navy uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}{props.required && <span className="text-gold"> *</span>}</span>
      <input className="input" {...props} />
    </label>
  );
}
