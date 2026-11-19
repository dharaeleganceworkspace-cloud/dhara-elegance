import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { forgotPassword } from "../actions";

export const metadata: Metadata = { title: "Forgot Password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="heading-lux mb-3 text-4xl text-navy">Reset your password</h1>
      <p className="mb-8 text-sm text-ink/60">Enter your email and we&apos;ll send you a reset link.</p>
      <AuthForm action={forgotPassword} submitLabel="Send reset link" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
      <Link href="/login" className="mt-6 block text-sm text-ink/60 hover:text-gold">← Back to sign in</Link>
    </>
  );
}
