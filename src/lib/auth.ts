import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function requireUser(next = "/account") {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

/** Returns the admin context or null. Use in server actions, which must not redirect on failure. */
export async function getAdmin() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { supabase, user, role: data.role as "admin" | "super_admin" };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?error=unauthorized");
  return admin;
}

type Supa = Awaited<ReturnType<typeof createClient>>;

export async function audit(supabase: Supa, actorId: string, action: string, entity: string, entityId: string | null, details?: Record<string, unknown>) {
  await supabase.from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId, details: details ?? null });
}
