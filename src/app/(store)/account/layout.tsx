import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

const LINKS = [
  ["Profile", "/account"],
  ["Orders", "/account/orders"],
  ["Addresses", "/account/addresses"],
  ["Wishlist", "/account/wishlist"],
] as const;

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="container-lux py-12 sm:py-16">
      <p className="eyebrow">My Account</p>
      <h1 className="heading-lux mt-2 text-4xl text-navy sm:text-5xl">Hello{user.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name).split(" ")[0]}` : ""}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Account">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="border-b border-navy/10 px-1 py-3 text-xs font-semibold tracking-[0.2em] whitespace-nowrap text-navy uppercase hover:text-gold">{label}</Link>
          ))}
          <form action={signOut}>
            <button className="px-1 py-3 text-left text-xs font-semibold tracking-[0.2em] whitespace-nowrap text-ink/50 uppercase hover:text-red-700">Sign out</button>
          </form>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
