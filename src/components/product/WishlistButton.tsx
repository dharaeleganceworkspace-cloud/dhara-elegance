"use client";

import { motion } from "framer-motion";
import { useStore } from "@/components/store/StoreProvider";
import { HeartIcon } from "@/components/icons";

export function WishlistButton({ productId, className = "", withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWish, notify } = useStore();
  const active = wishlist.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() => {
        toggleWish(productId);
        notify(active ? "Removed from wishlist" : "Saved to wishlist");
      }}
      className={`flex items-center gap-2 ${withLabel ? "btn-outline text-navy" : "rounded-full bg-white/90 p-2 text-navy shadow-sm backdrop-blur hover:text-gold"} ${className}`}
    >
      <motion.span key={String(active)} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.25, 1] }} transition={{ duration: 0.4 }} className={active ? "text-gold" : ""}>
        <HeartIcon filled={active} width={18} height={18} />
      </motion.span>
      {withLabel && (active ? "Saved" : "Wishlist")}
    </button>
  );
}
