import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create Account", robots: { index: false } };

export default function SignupPage() {
  return (
    <>
      <p className="eyebrow">Join Dhara Elegance</p>
      <h1 className="heading-lux mt-2 mb-8 text-4xl text-navy">Create account</h1>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        fields={[
          { name: "full_name", label: "Full name", autoComplete: "name" },
          { name: "phone", label: "Phone (optional)", type: "tel", required: false, autoComplete: "tel" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (min 8 characters)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-6 text-sm text-ink/60">
        Already have an account? <Link href="/login" className="text-navy hover:text-gold">Sign in</Link>
      </p>
    </>
  );
}
