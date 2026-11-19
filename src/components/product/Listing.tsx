import Link from "next/link";
import { ProductGrid } from "./ProductCard";
import { AutoSubmitSelect } from "./AutoSubmitSelect";
import { EmptyCollection } from "@/components/home/Sections";
import { getCategories, getFilterOptions, listProducts, SORTS, type ProductFilters, type SortKey } from "@/lib/catalog";
import type { Gender } from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | undefined) => (v && !Number.isNaN(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

export function parseFilters(sp: SP, gender?: Gender): ProductFilters {
  const g = one(sp.gender);
  const sort = one(sp.sort);
  return {
    q: one(sp.q),
    gender: gender ?? (g === "men" || g === "women" ? g : undefined),
    category: one(sp.category),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    inStock: one(sp.stock) === "1",
    size: one(sp.size),
    material: one(sp.material),
    metal: one(sp.metal),
    finish: one(sp.finish),
    sort: sort && sort in SORTS ? (sort as SortKey) : "featured",
    page: num(one(sp.page)) ?? 1,
  };
}

export async function Listing({ basePath, filters, fixedGender, dark = false }: { basePath: string; filters: ProductFilters; fixedGender?: Gender; dark?: boolean }) {
  const [{ products, total, page, pages }, categories, options] = await Promise.all([
    listProducts(filters),
    getCategories(fixedGender ?? filters.gender),
    getFilterOptions(fixedGender ?? filters.gender),
  ]);

  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: filters.q,
      gender: fixedGender ? undefined : filters.gender,
      category: filters.category,
      min: filters.min?.toString(),
      max: filters.max?.toString(),
      stock: filters.inStock ? "1" : undefined,
      size: filters.size,
      material: filters.material,
      metal: filters.metal,
      finish: filters.finish,
      sort: filters.sort === "featured" ? undefined : filters.sort,
      ...overrides,
    };
    Object.entries(base).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const muted = dark ? "text-cream/60" : "text-ink/60";
  const chip = (active: boolean) =>
    `whitespace-nowrap px-4 py-2 text-xs tracking-[0.15em] uppercase transition ${active ? (dark ? "bg-gold text-navy" : "bg-navy text-cream") : dark ? "border border-cream/20 text-cream/80 hover:border-gold" : "border border-navy/20 text-navy hover:border-gold"}`;

  return (
    <div className="container-lux pb-24">
      {/* Category tabs */}
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={qs({ category: undefined, page: undefined })} className={chip(!filters.category)}>All</Link>
        {categories.map((c) => (
          <Link key={c.id} href={qs({ category: c.slug, page: undefined })} className={chip(filters.category === c.slug)}>
            {fixedGender || filters.gender ? c.name : `${c.name} · ${c.gender}`}
          </Link>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <form method="get" action={basePath} className={`h-fit space-y-6 text-sm ${dark ? "text-cream" : "text-navy"}`}>
          <details className="group" open>
            <summary className="mb-4 cursor-pointer list-none text-xs font-semibold tracking-[0.25em] uppercase">Filters</summary>
            <div className="space-y-5">
              {filters.q && <input type="hidden" name="q" value={filters.q} />}
              {filters.category && <input type="hidden" name="category" value={filters.category} />}
              {filters.sort !== "featured" && <input type="hidden" name="sort" value={filters.sort} />}
              {!fixedGender && (
                <FilterSelect label="Gender" name="gender" value={filters.gender} options={["men", "women"]} />
              )}
              <div>
                <span className="label">Price (₹)</span>
                <div className="flex gap-2">
                  <input name="min" type="number" min={0} defaultValue={filters.min} placeholder="Min" className="input py-2" />
                  <input name="max" type="number" min={0} defaultValue={filters.max} placeholder="Max" className="input py-2" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="stock" value="1" defaultChecked={filters.inStock} className="accent-gold" /> In stock only
              </label>
              {options.sizes.length > 0 && <FilterSelect label="Size" name="size" value={filters.size} options={options.sizes} />}
              {options.materials.length > 0 && <FilterSelect label="Material" name="material" value={filters.material} options={options.materials} />}
              {options.metals.length > 0 && <FilterSelect label="Metal" name="metal" value={filters.metal} options={options.metals} />}
              {options.finishes.length > 0 && <FilterSelect label="Finish" name="finish" value={filters.finish} options={options.finishes} />}
              <div className="flex gap-2">
                <button className={dark ? "btn-gold flex-1" : "btn-navy flex-1"}>Apply</button>
                <Link href={basePath} className="btn-outline flex-1">Clear</Link>
              </div>
            </div>
          </details>
        </form>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm ${muted}`}>
              {total} {total === 1 ? "piece" : "pieces"}
              {filters.q && <> for &ldquo;{filters.q}&rdquo;</>}
            </p>
            <form method="get" action={basePath} className="flex items-center gap-2">
              {Object.entries({ q: filters.q, gender: fixedGender ? undefined : filters.gender, category: filters.category, min: filters.min?.toString(), max: filters.max?.toString(), stock: filters.inStock ? "1" : undefined, size: filters.size, material: filters.material, metal: filters.metal, finish: filters.finish }).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="sort" className={`text-xs tracking-wider uppercase ${muted}`}>Sort</label>
              <AutoSubmitSelect id="sort" name="sort" defaultValue={filters.sort} options={Object.entries(SORTS)} className={dark ? "border border-cream/20 bg-navy px-3 py-2 text-sm text-cream" : "border border-navy/15 bg-white px-3 py-2 text-sm"} />
            </form>
          </div>

          {products.length ? (
            <ProductGrid products={products} dark={dark} />
          ) : (
            <EmptyCollection dark={dark} text={filters.q ? "No pieces match your search. Try a different word or clear the filters." : "No pieces match these filters yet."} />
          )}

          {pages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && <Link href={qs({ page: String(page - 1) })} className={chip(false)}>← Prev</Link>}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages)
                .map((n) => (
                  <Link key={n} href={qs({ page: n === 1 ? undefined : String(n) })} aria-current={n === page ? "page" : undefined} className={chip(n === page)}>{n}</Link>
                ))}
              {page < pages && <Link href={qs({ page: String(page + 1) })} className={chip(false)}>Next →</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value?: string; options: string[] }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="input py-2 capitalize">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
