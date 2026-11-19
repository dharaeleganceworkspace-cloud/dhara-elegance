import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/account";
  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="heading-lux mt-2 mb-8 text-4xl text-navy">Sign in</h1>
      {sp.verified && <p className="mb-6 bg-emerald-50 p-3 text-sm text-emerald-800">Email verified. You can sign in now.</p>}
      {sp.error && <p className="mb-6 bg-red-50 p-3 text-sm text-red-800">That link is invalid or has expired.</p>}
      <AuthForm
        action={signIn}
        hidden={{ next }}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-ink/60 hover:text-gold">Forgot password?</Link>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-navy hover:text-gold">Create account</Link>
      </div>
      <p className="mt-8 text-xs text-ink/50">No account needed to order — you can check out as a guest.</p>
    </>
  );
}
