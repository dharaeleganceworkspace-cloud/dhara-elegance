import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { siteUrl } from "@/lib/format";
import "./globals.css";

const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dhara Elegance — Jewellery That Lives With You", template: "%s | Dhara Elegance" },
  description: "Anti-tarnish, waterproof, sweat-proof, skin-friendly jewellery for everyday wear. Shine Every Day.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Dhara Elegance",
    title: "Dhara Elegance — Jewellery That Lives With You",
    description: "Anti-tarnish. Waterproof. Sweat-proof. Made to shine every day.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
