import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { requireUser } from "@/lib/auth";
import { resetPassword } from "../actions";

export const metadata: Metadata = { title: "Choose a New Password", robots: { index: false } };

export default async function ResetPasswordPage() {
  // The reset email link signs the user in via /auth/callback before landing here.
  await requireUser("/reset-password");
  return (
    <>
      <h1 className="heading-lux mb-8 text-4xl text-navy">Choose a new password</h1>
      <AuthForm
        action={resetPassword}
        submitLabel="Update password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </>
  );
}
