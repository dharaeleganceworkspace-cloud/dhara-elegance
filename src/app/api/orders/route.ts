import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildWhatsAppOrderLink, buildWhatsAppOrderMessage, type WhatsAppOrder } from "@/lib/whatsapp";

const schema = z.object({
  items: z
    .array(z.object({ product_id: z.uuid(), variant_id: z.uuid().nullable(), quantity: z.number().int().min(1).max(20) }))
    .min(1)
    .max(30),
  customer: z.object({
    full_name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(20).regex(/^[+\d\s()-]+$/),
    email: z.union([z.literal(""), z.email().max(200)]).optional(),
    line1: z.string().trim().min(5).max(300),
    landmark: z.string().trim().max(150).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^[0-9A-Za-z -]{4,10}$/),
    country: z.string().trim().min(2).max(60),
    notes: z.string().trim().max(1000).optional(),
  }),
  coupon: z.string().trim().max(40).optional(),
});

/** Validates the order, saves it via place_order() (server prices + stock reservation), returns the WhatsApp link. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details: " + parsed.error.issues.map((i) => i.path.at(-1)).join(", ") }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: settings } = await supabase.from("site_settings").select("business_whatsapp").eq("id", 1).maybeSingle();
  if (!settings?.business_whatsapp) {
    return NextResponse.json({ error: "Online ordering is not set up yet. Please contact us directly." }, { status: 503 });
  }

  const { customer, items, coupon } = parsed.data;
  // Merge duplicate lines so stock is checked against the combined quantity.
  const merged = new Map<string, (typeof items)[number]>();
  for (const i of items) {
    const k = `${i.product_id}|${i.variant_id ?? ""}`;
    const prev = merged.get(k);
    merged.set(k, { ...i, quantity: Math.min(20, (prev?.quantity ?? 0) + i.quantity) });
  }

  const { data, error } = await supabase.rpc("place_order", { p_items: [...merged.values()], p_customer: customer, p_coupon: coupon || null });
  if (error) {
    // Messages raised by place_order() are written for customers; anything else stays generic.
    const friendly = error.code === "P0001" ? error.message : "We could not place your order. Please try again.";
    if (error.code !== "P0001") console.error("place_order failed", error);
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  const order = data as WhatsAppOrder & { order_id: string; whatsapp_number: string };
  const normalized: WhatsAppOrder = {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    total: Number(order.total),
    items: order.items.map((i) => ({ ...i, unit_price: Number(i.unit_price), line_total: Number(i.line_total) })),
  };

  return NextResponse.json({
    orderNumber: order.order_number,
    whatsappUrl: buildWhatsAppOrderLink(order.whatsapp_number, normalized),
    message: buildWhatsAppOrderMessage(normalized),
    total: normalized.total,
  });
}
