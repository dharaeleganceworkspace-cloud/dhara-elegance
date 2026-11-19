"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CartLine } from "@/lib/types";

const CART_KEY = "de-cart-v1";
const WISH_KEY = "de-wishlist-v1";
const MAX_QTY = 20;

export interface StoreSettings {
  shipping_fee: number;
  free_shipping_min: number | null;
}

interface StoreValue {
  ready: boolean;
  userId: string | null;
  lines: CartLine[];
  count: number;
  add: (line: CartLine) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
  wishlist: string[];
  toggleWish: (productId: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toast: string | null;
  notify: (message: string) => void;
  settings: StoreSettings;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

const key = (l: { product_id: string; variant_id: string | null }) => `${l.product_id}|${l.variant_id ?? ""}`;

function readLocal<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isLine(x: unknown): x is CartLine {
  const l = x as CartLine;
  return typeof l?.product_id === "string" && (l.variant_id === null || typeof l.variant_id === "string") && Number.isInteger(l.quantity) && l.quantity > 0;
}

export function StoreProvider({ children, settings }: { children: React.ReactNode; settings: StoreSettings }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncedUser = useRef<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Load the guest cart/wishlist from this browser.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on mount
    setLines(readLocal<unknown[]>(CART_KEY, []).filter(isLine));
    setWishlist(readLocal<unknown[]>(WISH_KEY, []).filter((x): x is string => typeof x === "string"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const writeServerCart = useCallback(
    async (uid: string, next: CartLine[]) => {
      await supabase.from("cart_items").delete().eq("user_id", uid);
      if (next.length) {
        await supabase.from("cart_items").insert(next.map((l) => ({ user_id: uid, product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })));
      }
    },
    [supabase],
  );
  // Merge the guest cart and wishlist into the account when a user signs in.
  const mergeIntoAccount = useCallback(
    async (uid: string) => {
      if (syncedUser.current === uid) return;
      syncedUser.current = uid;
      const [{ data: serverCart }, { data: serverWish }] = await Promise.all([
        supabase.from("cart_items").select("product_id,variant_id,quantity").eq("user_id", uid),
        supabase.from("wishlist_items").select("product_id").eq("user_id", uid),
      ]);
      const local = readLocal<unknown[]>(CART_KEY, []).filter(isLine);
      const merged = new Map<string, CartLine>();
      for (const l of [...((serverCart ?? []) as CartLine[]), ...local]) {
        const existing = merged.get(key(l));
        merged.set(key(l), { ...l, quantity: Math.min(MAX_QTY, Math.max(existing?.quantity ?? 0, l.quantity)) });
      }
      const mergedLines = [...merged.values()];
      setLines(mergedLines);
      await writeServerCart(uid, mergedLines);

      const localWish = readLocal<unknown[]>(WISH_KEY, []).filter((x): x is string => typeof x === "string");
      const serverIds = (serverWish ?? []).map((w) => w.product_id as string);
      const missing = localWish.filter((id) => !serverIds.includes(id));
      if (missing.length) {
        await supabase.from("wishlist_items").upsert(missing.map((product_id) => ({ user_id: uid, product_id })), { onConflict: "user_id,product_id", ignoreDuplicates: true });
      }
      setWishlist([...new Set([...serverIds, ...localWish])]);
    },
    [supabase, writeServerCart],
  );


  useEffect(() => {
    if (!ready) return;
    const apply = (uid: string | null) => {
      setUserId(uid);
      if (uid) void mergeIntoAccount(uid);
      else if (syncedUser.current) {
        // Signed out: don't leave the previous account's bag on this device.
        syncedUser.current = null;
        setLines([]);
        setWishlist([]);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user.id ?? null));
    // Sign-in/out happens in server actions, so also re-read the cookie session after each navigation.
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [ready, supabase, mergeIntoAccount, pathname]);

  // Persist every cart change to the account (debounced) when signed in.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const updateLines = useCallback(
    (fn: (prev: CartLine[]) => CartLine[]) => {
      setLines((prev) => {
        const next = fn(prev);
        if (userId) {
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => void writeServerCart(userId, next), 500);
        }
        return next;
      });
    },
    [userId, writeServerCart],
  );

  const add = useCallback(
    (line: CartLine) => {
      updateLines((prev) => {
        const existing = prev.find((l) => key(l) === key(line));
        if (existing) return prev.map((l) => (key(l) === key(line) ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l));
        return [...prev, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }];
      });
      notify("Added to your bag");
      setDrawerOpen(true);
    },
    [updateLines, notify],
  );

  const setQty = useCallback(
    (productId: string, variantId: string | null, qty: number) => {
      const k = key({ product_id: productId, variant_id: variantId });
      updateLines((prev) => (qty <= 0 ? prev.filter((l) => key(l) !== k) : prev.map((l) => (key(l) === k ? { ...l, quantity: Math.min(MAX_QTY, qty) } : l))));
    },
    [updateLines],
  );

  const remove = useCallback((productId: string, variantId: string | null) => setQty(productId, variantId, 0), [setQty]);
  const clear = useCallback(() => updateLines(() => []), [updateLines]);

  const toggleWish = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const has = prev.includes(productId);
        if (userId) {
          void (has
            ? supabase.from("wishlist_items").delete().eq("user_id", userId).eq("product_id", productId)
            : supabase.from("wishlist_items").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true }));
        }
        return has ? prev.filter((id) => id !== productId) : [...prev, productId];
      });
    },
    [userId, supabase],
  );

  const value: StoreValue = {
    ready,
    userId,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    add,
    setQty,
    remove,
    clear,
    wishlist,
    toggleWish,
    drawerOpen,
    setDrawerOpen,
    toast,
    notify,
    settings,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
