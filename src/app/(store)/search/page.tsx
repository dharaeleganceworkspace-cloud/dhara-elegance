import type { Metadata } from "next";
import { Listing, parseFilters } from "@/components/product/Listing";

export const metadata: Metadata = { title: "Search & Shop All", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const filters = parseFilters(await searchParams);
  return (
    <div>
      <section className="container-lux py-14 text-center sm:py-20">
        <p className="eyebrow">Shop All</p>
        <h1 className="heading-lux mt-3 text-5xl text-navy sm:text-6xl">{filters.q ? <>Results for &ldquo;{filters.q}&rdquo;</> : "All Jewellery"}</h1>
        <form method="get" action="/search" role="search" className="mx-auto mt-8 flex max-w-xl gap-2">
          <input name="q" defaultValue={filters.q} placeholder="Search by name, category, SKU…" className="input" aria-label="Search products" />
          <button className="btn-navy">Search</button>
        </form>
      </section>
      <Listing basePath="/search" filters={filters} />
    </div>
  );
}
