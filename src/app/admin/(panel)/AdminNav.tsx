"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["Dashboard", "/admin/dashboard"],
  ["Orders", "/admin/orders"],
  ["Products", "/admin/products"],
  ["Inventory", "/admin/inventory"],
  ["Categories", "/admin/categories"],
  ["Customers", "/admin/customers"],
  ["Reviews", "/admin/reviews"],
  ["Returns", "/admin/returns"],
  ["Coupons", "/admin/coupons"],
  ["Settings", "/admin/settings"],
  ["Audit Logs", "/admin/audit-logs"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3" aria-label="Admin">
      {LINKS.map(([label, href]) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={`px-3 py-2 text-sm whitespace-nowrap transition ${active ? "bg-gold text-navy" : "text-cream/75 hover:bg-white/5 hover:text-cream"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
