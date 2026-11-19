"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, reorderProductImages, replaceProductImage, updateProductImage } from "../../actions";
import type { ProductImage } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Uploads go straight to Supabase Storage (bucket RLS allows admins only); rows are written by server actions. */
export function ImageManager({ productId, productName, images }: { productId: string; productName: string; images: ProductImage[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProductImage | null>(null);
  const [, startTransition] = useTransition();
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  const upload = async (file: File) => {
    if (!TYPES.includes(file.type)) throw new Error(`${file.name}: use JPG, PNG, WebP or AVIF.`);
    if (file.size > MAX_BYTES) throw new Error(`${file.name}: max 5 MB.`);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (upErr) throw new Error(`${file.name}: ${upErr.message}`);
    return path;
  };

  const run = async (label: string, fn: () => Promise<{ ok: boolean; error?: string } | void>) => {
    setBusy(label);
    setError(null);
    try {
      const res = await fn();
      if (res && !res.ok) setError(res.error ?? "Something went wrong.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  };

  const onFiles = (files: FileList | null) =>
    files?.length &&
    run("Uploading…", async () => {
      for (const file of Array.from(files)) {
        const path = await upload(file);
        const res = await addProductImage(productId, path, productName);
        if (!res.ok) return res;
      }
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = sorted.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void run("Reordering…", () => reorderProductImages(productId, ids));
  };

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-navy/20 bg-white p-8 text-center text-sm hover:border-gold">
        <span className="font-semibold text-navy">Click to upload images</span>
        <span className="text-xs text-ink/50">JPG, PNG, WebP or AVIF · up to 5 MB each · multiple allowed</span>
        <input type="file" accept={TYPES.join(",")} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={Boolean(busy)} />
      </label>
      {busy && <p className="text-sm text-navy">{busy}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((img, i) => (
          <li key={img.id} className={`bg-white p-3 shadow-sm ${img.is_primary ? "ring-2 ring-gold" : ""}`}>
            <button type="button" onClick={() => setPreview(img)} className="relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-navy/5" aria-label="Zoom preview">
              <Image src={img.url} alt={img.alt_text ?? ""} fill sizes="300px" className="object-cover" />
              {img.is_primary && <span className="absolute top-2 left-2 bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">PRIMARY</span>}
            </button>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const alt = new FormData(e.currentTarget).get("alt");
                void run("Saving alt text…", () => updateProductImage(img.id, "alt", String(alt ?? "")));
              }}
            >
              <input name="alt" defaultValue={img.alt_text ?? ""} placeholder="Alt text" className="input py-1.5 text-xs" aria-label="Alt text" />
              <button className="border border-navy/20 px-2 text-xs">Save</button>
            </form>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30">← Move</button>
              <button type="button" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30">Move →</button>
              {!img.is_primary && <button type="button" onClick={() => run("Setting primary…", () => updateProductImage(img.id, "primary"))} className="text-navy underline">Set primary</button>}
              <label className="cursor-pointer text-navy underline">
                Replace
                <input
                  type="file"
                  accept={TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void run("Replacing…", async () => replaceProductImage(img.id, await upload(file)));
                  }}
                />
              </label>
              <button type="button" onClick={() => confirm("Delete this image?") && run("Deleting…", () => updateProductImage(img.id, "delete"))} className="text-red-700 underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {!sorted.length && <p className="text-sm text-ink/50">No images yet. The first image you upload becomes the primary image.</p>}

      {preview && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 p-4" onClick={() => setPreview(null)}>
          <div className="relative h-[85vh] w-full max-w-4xl">
            <Image src={preview.url} alt={preview.alt_text ?? ""} fill sizes="100vw" className="object-contain" />
          </div>
          <button className="absolute top-4 right-4 text-3xl text-cream" aria-label="Close preview">×</button>
        </div>
      )}
    </div>
  );
}
