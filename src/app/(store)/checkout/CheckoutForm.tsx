"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/store/CartView";
import { shippingFor } from "@/components/store/useProducts";
import { WhatsAppIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Address } from "@/lib/types";

export const LAST_ORDER_KEY = "de-last-order";

const empty = { full_name: "", phone: "", email: "", line1: "", landmark: "", city: "", state: "", pincode: "", country: "India", notes: "" };
type Form = typeof empty;

export function CheckoutForm() {
  const { priced, subtotal, loading, hasProblem, userId, settings, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<Form>(empty);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the signed-in customer's default address/profile.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    void Promise.all([
      supabase.from("addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("full_name,phone,email").eq("id", userId).maybeSingle(),
    ]).then(([{ data: addr }, { data: profile }]) => {
      const a = addr as Address | null;
      setForm((f) => ({
        ...f,
        full_name: f.full_name || a?.full_name || profile?.full_name || "",
        phone: f.phone || a?.phone || profile?.phone || "",
        email: f.email || profile?.email || "",
        line1: f.line1 || a?.line1 || "",
        landmark: f.landmark || a?.landmark || "",
        city: f.city || a?.city || "",
        state: f.state || a?.state || "",
        pincode: f.pincode || a?.pincode || "",
        country: a?.country || f.country,
      }));
    });
  }, [userId]);

  const discountAmount = discount && subtotal > 0 ? Math.min(discount.amount, subtotal) : 0;
  const afterDiscount = subtotal - discountAmount;
  const shipping = shippingFor(afterDiscount, settings);
  const total = Math.max(0, afterDiscount + shipping);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyCoupon = async () => {
    setCouponMsg(null);
    if (!coupon.trim()) return;
    const { data } = await createClient().rpc("preview_coupon", { p_code: coupon.trim(), p_subtotal: subtotal });
    const res = data as { valid: boolean; message?: string; code?: string; discount?: number } | null;
    if (res?.valid && res.code) {
      setDiscount({ code: res.code, amount: Number(res.discount) });
      setCouponMsg(`Coupon ${res.code} applied.`);
    } else {
      setDiscount(null);
      setCouponMsg(res?.message ?? "This coupon is not valid.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (hasProblem) return setError("Please fix the items marked in your bag before ordering.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: priced.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity })),
          customer: form,
          coupon: discount?.code,
        }),
      });
      const data = (await res.json()) as { error?: string; orderNumber?: string; whatsappUrl?: string; total?: number };
      if (!res.ok || !data.whatsappUrl) throw new Error(data.error ?? "We could not place your order.");
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl, total: data.total }));
      clear();
      router.push("/order/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-96 animate-pulse bg-navy/5" />;
  if (!priced.length)
    return (
      <div className="py-16 text-center">
        <p className="heading-lux text-3xl text-navy">Your bag is empty</p>
        <Link href="/" className="btn-navy mt-6">Continue shopping</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" required value={form.full_name} onChange={set("full_name")} autoComplete="name" />
          <Field label="Phone number (WhatsApp)" required type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+91 98765 43210" />
        </div>
        <Field label="Email (optional)" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        <Field label="Address" required value={form.line1} onChange={set("line1")} autoComplete="street-address" placeholder="House no., street, area" />
        <Field label="Landmark (optional)" value={form.landmark} onChange={set("landmark")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" required value={form.city} onChange={set("city")} autoComplete="address-level2" />
          <Field label="State" required value={form.state} onChange={set("state")} autoComplete="address-level1" />
          <Field label="PIN code" required value={form.pincode} onChange={set("pincode")} autoComplete="postal-code" inputMode="numeric" />
          <Field label="Country" required value={form.country} onChange={set("country")} autoComplete="country-name" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Order notes (optional)</label>
          <textarea id="notes" rows={3} maxLength={1000} value={form.notes} onChange={set("notes")} className="input" placeholder="Gift wrap, preferred delivery time…" />
        </div>
        {!userId && (
          <p className="text-xs text-ink/55">
            Ordering as a guest. <Link href="/login?next=/checkout" className="text-navy underline">Sign in</Link> to track orders in your account.
          </p>
        )}
      </div>

      <aside className="h-fit space-y-5 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,35,69,0.5)] sm:p-8 lg:sticky lg:top-28">
        <h2 className="heading-lux text-2xl text-navy">Order summary</h2>
        <ul className="divide-y divide-navy/10 text-sm">
          {priced.map((l) => (
            <li key={`${l.product_id}|${l.variant_id}`} className="py-3">
              <div className="flex justify-between gap-3">
                <span className="text-navy">{l.product?.name ?? "Unavailable item"}</span>
                <span className="font-semibold">{formatINR(l.unitPrice * l.quantity)}</span>
              </div>
              <p className="text-xs text-ink/55">
                {l.variantName && <>Size {l.variantName} · </>}Qty {l.quantity} × {formatINR(l.unitPrice)}
              </p>
              {l.problem && <p className="text-xs font-medium text-red-700">{l.problem}</p>}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="input py-2 uppercase" aria-label="Coupon code" />
          <button type="button" onClick={applyCoupon} className="btn-outline px-4 text-navy">Apply</button>
        </div>
        {couponMsg && <p className={`text-xs ${discount ? "text-emerald-700" : "text-red-700"}`}>{couponMsg}</p>}

        <dl className="space-y-2 border-t border-navy/10 pt-4 text-sm">
          <Row label="Subtotal" value={formatINR(subtotal)} />
          <Row label="Discount" value={discountAmount > 0 ? `−${formatINR(discountAmount)}` : formatINR(0)} />
          <Row label="Shipping" value={shipping > 0 ? formatINR(shipping) : "Free"} />
          <div className="flex justify-between border-t border-navy/10 pt-3 text-lg font-semibold text-navy">
            <dt>Final total</dt>
            <dd>{formatINR(total)}</dd>
          </div>
        </dl>

        {error && <p role="alert" className="bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <button disabled={submitting || hasProblem} className="btn-whatsapp w-full py-4 text-sm">
          <WhatsAppIcon /> {submitting ? "Saving your order…" : "Place order on WhatsApp"}
        </button>
        <p className="text-xs leading-relaxed text-ink/55">
          No online payment is taken. Your order is saved, then WhatsApp opens with the order details. Press <strong>Send</strong> to share it with Dhara Elegance; we&apos;ll confirm availability, delivery and payment with you there.
        </p>
      </aside>
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}{props.required && <span className="text-gold"> *</span>}</label>
      <input id={id} className="input" {...props} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink/60">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
