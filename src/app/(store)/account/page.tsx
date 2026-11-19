import { ProfileForm } from "./ProfileForm";
import { requireUser } from "@/lib/auth";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const { data: profile } = await supabase.from("profiles").select("full_name,phone,email,created_at").eq("id", user.id).maybeSingle();
  return (
    <div className="max-w-xl">
      {sp.reset && <p className="mb-6 bg-emerald-50 p-3 text-sm text-emerald-800">Your password has been updated.</p>}
      <h2 className="heading-lux mb-6 text-3xl text-navy">Profile</h2>
      <p className="mb-6 text-sm text-ink/60">Signed in as {user.email}</p>
      <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
    </div>
  );
}
