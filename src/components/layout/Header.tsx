"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import type { Category } from "@/lib/types";

export function Header({ logo, categories }: { logo: React.ReactNode; categories: Category[] }) {
  const { count, wishlist, setDrawerOpen, ready } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scroll while the mobile menu is open and close it with Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const men = categories.filter((c) => c.gender === "men");
  const women = categories.filter((c) => c.gender === "women");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
    <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? "bg-cream/90 shadow-[0_8px_30px_-20px_rgba(15,35,69,0.5)] backdrop-blur-md" : "bg-cream"}`}>
      <div className="container-lux flex h-16 items-center justify-between gap-4 sm:h-20">
        <button className="p-2 text-navy lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </button>

        <Link href="/" aria-label="Dhara Elegance home" className="shrink-0">
          {logo}
        </Link>

        <nav className="hidden items-center gap-10 lg:flex" aria-label="Main">
          <NavGroup label="Women" href="/women" items={women} />
          <NavGroup label="Men" href="/men" items={men} />
          <Link href="/search?sort=newest" className="nav-link text-xs font-semibold tracking-[0.25em] text-navy uppercase hover:text-gold">New In</Link>
          <Link href="/search?sort=best" className="text-xs font-semibold tracking-[0.25em] text-navy uppercase hover:text-gold">Best Sellers</Link>
          <Link href="/about" className="text-xs font-semibold tracking-[0.25em] text-navy uppercase hover:text-gold">Our Story</Link>
        </nav>

        <div className="flex items-center gap-1 text-navy sm:gap-2">
          <button className="p-2 hover:text-gold" aria-label="Search" onClick={() => setSearchOpen((s) => !s)}>
            <SearchIcon />
          </button>
          <Link href="/account" className="hidden p-2 hover:text-gold sm:block" aria-label="Account">
            <UserIcon />
          </Link>
          <Link href="/wishlist" className="relative p-2 hover:text-gold" aria-label={`Wishlist, ${wishlist.length} items`}>
            <HeartIcon />
            {ready && wishlist.length > 0 && <Badge n={wishlist.length} />}
          </Link>
          <button className="relative p-2 hover:text-gold" aria-label={`Shopping bag, ${count} items`} onClick={() => setDrawerOpen(true)}>
            <BagIcon />
            {ready && count > 0 && <Badge n={count} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={submitSearch}
            className="overflow-hidden border-t border-navy/10 bg-cream"
            role="search"
          >
            <div className="container-lux flex gap-3 py-4">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rings, chains, kadas, SKU…" className="input" aria-label="Search products" />
              <button className="btn-navy">Search</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

    </header>

      {/* Rendered outside <header>: the header's backdrop-blur would otherwise become the
          containing block for these fixed elements and shrink the menu to header height. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-navy/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
            <motion.aside
              className="fixed top-0 bottom-0 left-0 z-[60] flex h-dvh w-[86%] max-w-sm flex-col overflow-y-auto overscroll-contain bg-navy p-6 text-cream lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Mobile menu"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="eyebrow">Menu</span>
                <button aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              <form onSubmit={submitSearch} className="mb-8">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jewellery" className="w-full border-b border-cream/30 bg-transparent py-2 text-sm outline-none placeholder:text-cream/50 focus:border-gold" aria-label="Search products" />
              </form>
              {[
                { label: "Women", href: "/women", items: women },
                { label: "Men", href: "/men", items: men },
              ].map((g) => (
                <div key={g.label} className="mb-6">
                  <Link href={g.href} onClick={() => setMenuOpen(false)} className="font-display text-3xl">{g.label}</Link>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {g.items.map((c) => (
                      <Link key={c.id} href={`${g.href}?category=${c.slug}`} onClick={() => setMenuOpen(false)} className="text-sm text-cream/70 hover:text-gold">{c.name}</Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-auto flex flex-col gap-3 border-t border-cream/15 pt-6 text-sm">
                <Link href="/search?sort=newest" onClick={() => setMenuOpen(false)}>New In</Link>
                <Link href="/search?sort=best" onClick={() => setMenuOpen(false)}>Best Sellers</Link>
                <Link href="/about" onClick={() => setMenuOpen(false)}>Our Story</Link>
                <Link href="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <motion.span key={n} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">
      {n}
    </motion.span>
  );
}

function NavGroup({ label, href, items }: { label: string; href: string; items: Category[] }) {
  return (
    <div className="group relative">
      <Link href={href} className="py-6 text-xs font-semibold tracking-[0.25em] text-navy uppercase hover:text-gold">{label}</Link>
      <div className="invisible absolute top-full left-1/2 w-56 -translate-x-1/2 translate-y-2 border border-navy/10 bg-white p-5 opacity-0 shadow-xl transition-all duration-300 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <Link href={href} className="mb-3 block font-display text-xl text-navy">All {label}</Link>
        {items.map((c) => (
          <Link key={c.id} href={`${href}?category=${c.slug}`} className="block py-1.5 text-sm text-ink/70 hover:text-gold">{c.name}</Link>
        ))}
      </div>
    </div>
  );
}
