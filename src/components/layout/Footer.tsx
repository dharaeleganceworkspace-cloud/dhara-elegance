import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Newsletter } from "@/components/home/Newsletter";
import type { SiteSettings } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

export function Footer({ settings }: { settings: SiteSettings | null }) {
  const support = settings?.support_whatsapp ?? settings?.business_whatsapp;
  return (
    <footer className="mt-auto bg-navy-deep text-cream">
      <div className="container-lux grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-cream/60">Anti-tarnish. Waterproof. Sweat-proof. Made to shine every day.</p>
          {support && (
            <a href={waLink(support, "Hello Dhara Elegance, I have a question.")} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-gold hover:text-gold-light">
              Chat with us on WhatsApp →
            </a>
          )}
        </div>
        <FooterCol title="Shop" links={[["Women", "/women"], ["Men", "/men"], ["New In", "/search?sort=newest"], ["Best Sellers", "/search?sort=best"]]} />
        <FooterCol title="Help" links={[["My Account", "/account"], ["My Orders", "/account/orders"], ["Wishlist", "/wishlist"], ["Care & FAQ", "/#faq"], ["Our Story", "/about"]]} />
        <div>
          <h3 className="eyebrow mb-5">Newsletter</h3>
          <p className="mb-4 text-sm text-cream/60">New drops and styling notes, a few times a month.</p>
          <Newsletter dark />
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-lux flex flex-col items-center justify-between gap-2 py-6 text-xs text-cream/40 sm:flex-row">
          <span>© {new Date().getFullYear()} Dhara Elegance. All rights reserved.</span>
          <span className="tracking-[0.3em] uppercase">Shine Every Day</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="eyebrow mb-5">{title}</h3>
      <ul className="space-y-3 text-sm text-cream/70">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-gold">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
