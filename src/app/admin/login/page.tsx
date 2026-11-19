import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { adminSignIn } from "../actions";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center"><Logo light size={52} /></div>
        <h1 className="heading-lux mb-2 text-center text-3xl text-cream">Admin Portal</h1>
        <p className="mb-8 text-center text-xs tracking-widest text-cream/50 uppercase">Authorized staff only</p>
        {sp.error === "unauthorized" && <p className="mb-5 bg-red-900/40 p-3 text-sm text-red-100">Please sign in with an admin account.</p>}
        <AuthForm
          dark
          action={adminSignIn}
          submitLabel="Sign in"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "username" },
            { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
        />
      </div>
    </main>
  );
}
