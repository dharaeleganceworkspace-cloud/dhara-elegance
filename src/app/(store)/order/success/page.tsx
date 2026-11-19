"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { formatINR } from "@/lib/format";

interface LastOrder {
  orderNumber: string;
  whatsappUrl: string;
  total: number;
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<LastOrder | null | undefined>(undefined);

  useEffect(() => {
    let parsed: LastOrder | null = null;
    try {
      parsed = JSON.parse(sessionStorage.getItem("de-last-order") ?? "null") as LastOrder | null;
    } catch {
      parsed = null;
    }
    // Only follow links we built ourselves.
    if (parsed && !parsed.whatsappUrl.startsWith("https://wa.me/")) parsed = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from sessionStorage
    setOrder(parsed);
    if (parsed && !sessionStorage.getItem(`de-opened-${parsed.orderNumber}`)) {
      sessionStorage.setItem(`de-opened-${parsed.orderNumber}`, "1");
      const t = setTimeout(() => window.location.assign(parsed.whatsappUrl), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (order === undefined) return <div className="min-h-[60vh]" />;
  if (!order)
    return (
      <div className="container-lux py-24 text-center">
        <h1 className="heading-lux text-4xl text-navy">No recent order found</h1>
        <p className="mt-3 text-sm text-ink/60">If you placed an order, check your account or contact us on WhatsApp.</p>
        <Link href="/" className="btn-navy mt-8">Back to home</Link>
      </div>
    );

  return (
    <div className="container-lux flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-3xl text-navy">✓</motion.div>
      <p className="eyebrow mt-8">Order {order.orderNumber}</p>
      <h1 className="heading-lux mt-3 max-w-2xl text-4xl text-navy sm:text-5xl">Your order has been saved.</h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/70">
        Continue to WhatsApp and press <strong>Send</strong> to share the order with Dhara Elegance.
      </p>
      <p className="mt-2 text-sm text-ink/55">Order total {formatINR(order.total)} · Status: awaiting confirmation on WhatsApp. No payment has been taken.</p>
      <div className="mt-10 flex w-full max-w-md flex-col gap-3">
        <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-4 text-sm">
          <WhatsAppIcon /> Open WhatsApp Again
        </a>
        <Link href="/" className="btn-outline text-navy">Continue shopping</Link>
      </div>
      <p className="mt-8 max-w-md text-xs text-ink/50">If WhatsApp didn&apos;t open, tap the button above. Your order is already saved — our team will confirm it once you send the message.</p>
    </div>
  );
}
