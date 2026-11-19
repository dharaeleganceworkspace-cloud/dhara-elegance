import { formatINR } from "./format.ts";

/** Digits only, international format, no plus sign. Returns null when it cannot be a valid number. */
export function normalizeWhatsAppNumber(input: string, defaultCountryCode = "91"): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = defaultCountryCode + digits; // local number without country code
  if (digits.length === 11 && digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
}

export function waLink(number: string, message: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppOrder {
  order_number: string;
  customer_name: string;
  phone: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shipping_address: { city: string; state: string; pincode: string };
  items: { product_name: string; variant_name: string | null; quantity: number; unit_price: number; line_total: number }[];
}

export function buildWhatsAppOrderMessage(order: WhatsAppOrder) {
  const items = order.items
    .map(
      (i, n) =>
        `${n + 1}. ${i.product_name}${i.variant_name ? ` (Size: ${i.variant_name})` : ""}\n` +
        `   Qty: ${i.quantity} × ${formatINR(i.unit_price)} = ${formatINR(i.line_total)}`,
    )
    .join("\n");
  return [
    "*DHARA ELEGANCE — NEW ORDER*",
    "",
    `Order Number: ${order.order_number}`,
    `Customer Name: ${order.customer_name}`,
    `Customer Phone: +${order.phone}`,
    "",
    "*ORDER ITEMS:*",
    items,
    "",
    "*ORDER SUMMARY:*",
    `Subtotal: ${formatINR(order.subtotal)}`,
    `Discount: ${order.discount > 0 ? "-" : ""}${formatINR(order.discount)}`,
    `Shipping: ${order.shipping > 0 ? formatINR(order.shipping) : "Free"}`,
    `Final Total: ${formatINR(order.total)}`,
    "",
    "*DELIVERY:*",
    `City: ${order.shipping_address.city}`,
    `State: ${order.shipping_address.state}`,
    `PIN Code: ${order.shipping_address.pincode}`,
    "",
    "I have placed this order through the Dhara Elegance website. Please confirm availability and delivery details.",
  ].join("\n");
}

/** wa.me link to the business number, pre-filled with the order. */
export function buildWhatsAppOrderLink(businessNumber: string, order: WhatsAppOrder) {
  return waLink(businessNumber, buildWhatsAppOrderMessage(order));
}

/** Admin → customer chat, pre-filled with an order reference. */
export function buildCustomerChatLink(customerPhone: string, orderNumber: string, customerName: string, countryCode = "91") {
  const number = normalizeWhatsAppNumber(customerPhone, countryCode);
  if (!number) return null;
  return waLink(number, `Hello ${customerName}, this is Dhara Elegance regarding your order ${orderNumber}.`);
}
