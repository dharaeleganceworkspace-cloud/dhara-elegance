import { requireAdmin } from "@/lib/auth";
import { PageHeader, Pager, Table } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Audit Logs" };
const PER = 50;

export default async function AuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { data, count } = await supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
  const actorIds = [...new Set((data ?? []).map((l) => l.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,email,full_name").in("id", actorIds) : { data: [] };
  const who = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email]));

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Every admin change to products, orders, stock and settings." />
      <Table head={["When", "Who", "Action", "Entity", "Details"]} empty={!data?.length}>
        {(data ?? []).map((l) => (
          <tr key={l.id} className="align-top">
            <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(l.created_at)}</td>
            <td className="px-4 py-3 text-xs">{who.get(l.actor_id) ?? "—"}</td>
            <td className="px-4 py-3 font-medium text-navy">{l.action}</td>
            <td className="px-4 py-3 text-xs">{l.entity}{l.entity_id && <span className="block text-ink/40">{String(l.entity_id).slice(0, 13)}</span>}</td>
            <td className="max-w-md px-4 py-3"><code className="text-[11px] break-all text-ink/60">{l.details ? JSON.stringify(l.details) : ""}</code></td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil((count ?? 0) / PER)} href={(n) => `/admin/audit-logs?page=${n}`} />
    </>
  );
}
