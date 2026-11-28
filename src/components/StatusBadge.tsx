import type { DisplayStatus } from "@/lib/inventory/rules";

const STYLE: Record<DisplayStatus, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "bg-violet text-cream" },
  only_one_left: { label: "Only 1 left", cls: "bg-sun text-ink" },
  sold: { label: "Sold", cls: "bg-ink text-sun" },
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STYLE[status];
  return (
    <span className={`inline-block rounded-full border-2 border-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}
