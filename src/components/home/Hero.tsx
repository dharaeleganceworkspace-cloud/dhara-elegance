"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { LogoMark } from "@/components/Logo";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const markY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[88svh] items-center overflow-hidden bg-navy text-cream">
      {/* Light and ring layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-1/3 left-1/2 h-[120vh] w-[120vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(10,24,48,0.9))]" />
        <motion.div style={{ y: markY }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-spin-slow h-[70vmin] w-[70vmin] rounded-full border border-gold/15" />
          <div className="animate-spin-slow absolute inset-[8%] rounded-full border border-dashed border-gold/10 [animation-direction:reverse]" />
        </motion.div>
      </div>

      <motion.div style={{ y: textY, opacity: fade }} className="container-lux flex flex-col items-center py-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1.4, ease }}>
          <LogoMark size={96} className="bg-gold" />
        </motion.div>
        <motion.p initial={{ opacity: 0, letterSpacing: "0.1em" }} animate={{ opacity: 1, letterSpacing: "0.45em" }} transition={{ duration: 1.4, delay: 0.3, ease }} className="mt-8 text-[11px] font-semibold text-gold-light uppercase">
          Shine Every Day
        </motion.p>
        <h1 className="heading-lux mt-6 max-w-4xl text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-8xl">
          {["Jewellery that", "lives with you."].map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span className={`block ${i === 1 ? "gold-text italic" : ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.5 + i * 0.15, ease }}>
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1 }} className="mt-6 max-w-xl text-sm leading-relaxed text-cream/70 sm:text-base">
          Anti-tarnish. Waterproof. Sweat-proof. Made to shine every day.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.15 }} className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/women" className="btn-gold">Shop Women</Link>
          <Link href="/men" className="btn border border-cream/40 text-cream hover:border-gold hover:text-gold">Shop Men</Link>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] text-cream/40 uppercase">
        Scroll
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="mx-auto mt-2 block h-8 w-px bg-gold/60" />
      </motion.div>
    </section>
  );
}
