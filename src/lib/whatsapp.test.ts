import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCustomerChatLink, buildWhatsAppOrderLink, normalizeWhatsAppNumber } from "./whatsapp.ts";

test("normalizes phone numbers to digits with country code", () => {
  assert.equal(normalizeWhatsAppNumber("+91 98765-43210"), "919876543210");
  assert.equal(normalizeWhatsAppNumber("(98765) 43210"), "919876543210");
  assert.equal(normalizeWhatsAppNumber("098765 43210"), "919876543210");
  assert.equal(normalizeWhatsAppNumber("0044 7700 900123", "91"), "447700900123");
  assert.equal(normalizeWhatsAppNumber("12345"), null);
  assert.equal(normalizeWhatsAppNumber("abc"), null);
});

test("builds an encoded wa.me order link", () => {
  const url = buildWhatsAppOrderLink("919876543210", {
    order_number: "DE261117-1001",
    customer_name: "Asha & Co",
    phone: "919999999999",
    subtotal: 1999,
    discount: 200,
    shipping: 0,
    total: 1799,
    shipping_address: { city: "Pune", state: "Maharashtra", pincode: "411001" },
    items: [{ product_name: "Aura Ring", variant_name: "7", quantity: 1, unit_price: 1999, line_total: 1999 }],
  });
  assert.ok(url.startsWith("https://wa.me/919876543210?text="));
  assert.ok(!url.includes(" ") && !url.includes("&Co"), "message must be URL-encoded");
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.match(text, /DHARA ELEGANCE — NEW ORDER/);
  assert.match(text, /Order Number: DE261117-1001/);
  assert.match(text, /Aura Ring \(Size: 7\)/);
  assert.match(text, /PIN Code: 411001/);
  assert.match(text, /Please confirm availability and delivery details\./);
  assert.ok(!text.includes("line1"), "full street address is not sent in the link");
});

test("customer chat link uses the customer's number", () => {
  assert.match(buildCustomerChatLink("9876543210", "DE1", "Ravi") ?? "", /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.equal(buildCustomerChatLink("123", "DE1", "Ravi"), null);
});
