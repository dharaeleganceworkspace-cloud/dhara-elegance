import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Place Your Order", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-lux py-12 sm:py-16">
      <p className="eyebrow">Checkout</p>
      <h1 className="heading-lux mt-3 mb-10 text-4xl text-navy sm:text-5xl">Delivery details</h1>
      <CheckoutForm />
    </div>
  );
}
