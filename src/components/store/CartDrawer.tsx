"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useStore } from "./StoreProvider";
import { CartLines, CartTotals } from "./CartView";
import { CloseIcon } from "@/components/icons";

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, count, toast } = useStore();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <>
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Shopping bag"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between border-b border-navy/10 px-6 py-5">
                <h2 className="heading-lux text-2xl text-navy">Your Bag ({count})</h2>
                <button aria-label="Close bag" onClick={() => setDrawerOpen(false)} className="text-navy hover:text-gold">
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <CartLines compact />
              </div>
              {count > 0 && (
                <div className="space-y-4 border-t border-navy/10 bg-white px-6 py-5">
                  <CartTotals />
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/cart" onClick={() => setDrawerOpen(false)} className="btn-outline text-navy">View Bag</Link>
                    <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="btn-navy">Proceed to Order</Link>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 bg-navy px-6 py-3 text-xs font-semibold tracking-[0.2em] text-cream uppercase shadow-xl">
            <span className="text-gold">✦</span> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
