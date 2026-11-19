"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, ZoomIcon } from "@/components/icons";
import type { ProductImage } from "@/lib/types";

export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => {
      if (!images.length) return;
      setDirection(next > index ? 1 : -1);
      setIndex((next + images.length) % images.length);
      setZoom(null);
    },
    [index, images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center bg-[#f1ece2]">
        <span className="font-display text-7xl text-gold/60">DE</span>
      </div>
    );
  }

  const current = images[index];
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      touchX.current = null;
    },
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto md:w-20 md:flex-col" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === index}
              aria-label={`Show image ${i + 1}`}
              onClick={() => go(i)}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden border-2 transition md:w-full ${i === index ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden bg-[#f1ece2]"
          {...swipe}
          onMouseMove={(e) => {
            if (window.matchMedia("(hover: hover)").matches) {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setFullscreen(true)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={current.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={current.url}
                alt={current.alt_text ?? name}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-200"
                style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </motion.div>
          </AnimatePresence>
          <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-white/90 p-2 text-navy shadow"><ZoomIcon /></span>
          {images.length > 1 && (
            <span className="absolute bottom-3 left-3 bg-white/90 px-2 py-1 text-[10px] font-semibold tracking-widest text-navy">{index + 1} / {images.length}</span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} images`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-navy-deep/95 backdrop-blur"
          >
            <div className="flex items-center justify-between p-4 text-cream">
              <span className="text-xs tracking-widest">{index + 1} / {images.length}</span>
              <button aria-label="Close full screen" onClick={() => setFullscreen(false)} className="p-2 hover:text-gold"><CloseIcon /></button>
            </div>
            <FullscreenImage key={current.id} src={current.url} alt={current.alt_text ?? name} swipe={swipe} />
            {images.length > 1 && (
              <div className="flex justify-center gap-4 p-4 text-cream">
                <button onClick={() => go(index - 1)} className="btn border border-cream/30" aria-label="Previous image">←</button>
                <button onClick={() => go(index + 1)} className="btn border border-cream/30" aria-label="Next image">→</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Click-to-zoom inside the full-screen viewer. */
function FullscreenImage({ src, alt, swipe }: { src: string; alt: string; swipe: Record<string, (e: React.TouchEvent) => void> }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  return (
    <div className="relative flex-1 overflow-hidden" {...swipe}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-4">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className={`object-contain transition-transform duration-300 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={{ transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: origin }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            setZoomed((z) => !z);
          }}
        />
      </motion.div>
    </div>
  );
}
