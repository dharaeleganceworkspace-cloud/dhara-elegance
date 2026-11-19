import Link from "next/link";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="heading-lux text-3xl text-navy sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 text-xs font-bold tracking-[0.2em] text-navy uppercase">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-navy/5 text-[11px] tracking-wider text-navy/70 uppercase">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-navy/5">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-ink/50">Nothing here yet.</p>}
    </div>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      {page > 1 && <Link href={href(page - 1)} className="border border-navy/20 bg-white px-3 py-1.5">← Prev</Link>}
      <span className="text-ink/50">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="border border-navy/20 bg-white px-3 py-1.5">Next →</Link>}
    </div>
  );
}
