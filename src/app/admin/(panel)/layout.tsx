import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AdminNav } from "./AdminNav";
import { adminSignOut } from "../actions";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[250px_1fr]">
      <aside className="bg-navy text-cream lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link href="/admin/dashboard"><Logo light size={36} /></Link>
          <p className="hidden pt-3 text-[10px] tracking-widest text-cream/40 uppercase lg:block">{role.replace("_", " ")} · {user.email}</p>
        </div>
        <AdminNav />
        <div className="flex gap-5 px-5 pb-4 text-xs lg:block lg:space-y-2 lg:p-5">
          <Link href="/" target="_blank" className="block text-cream/60 hover:text-gold">View store ↗</Link>
          <form action={adminSignOut}><button className="text-cream/60 hover:text-red-300">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0 p-4 sm:p-8">{children}</div>
    </div>
  );
}
