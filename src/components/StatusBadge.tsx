import { STATUS_LABEL, type OrderStatus } from "@/lib/types";

const COLORS: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  pending_confirmation: "bg-amber-100 text-amber-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  processing: "bg-violet-100 text-violet-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${COLORS[status]}`}>{STATUS_LABEL[status]}</span>;
}
