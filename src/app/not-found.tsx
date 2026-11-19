import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-navy p-8 text-center text-cream">
      <LogoMark size={72} className="bg-gold" />
      <h1 className="heading-lux text-5xl">This piece isn&apos;t here.</h1>
      <p className="text-sm text-cream/60">The page you&apos;re looking for has moved or no longer exists.</p>
      <Link href="/" className="btn-gold">Back to Dhara Elegance</Link>
    </main>
  );
}
