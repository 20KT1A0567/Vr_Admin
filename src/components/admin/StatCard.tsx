import { MetricTrend } from "components/admin/MetricTrend";
import type { ReactNode } from "react";
import { cn } from "utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
  accentClassName?: string;
  trend?: "up" | "down" | "neutral" | "flat";
}

export function StatCard({ label, value, meta, icon, accentClassName = "bg-emerald-50 text-emerald-700", trend = "neutral" }: StatCardProps) {
  const trendDirection = trend === "up" ? "up" : trend === "down" ? "down" : "flat";

  return (
    <article className="admin-kpi-card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,rgba(37,99,235,0),rgba(37,99,235,0.42),rgba(15,159,110,0.28),rgba(37,99,235,0))]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="admin-kpi-value">{value}</div>
          <div className="admin-kpi-meta flex flex-wrap items-center gap-2">
            <MetricTrend direction={trendDirection} value={meta} />
          </div>
        </div>
        <div className="rounded-[22px] border border-white/80 bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] shadow-sm", accentClassName)}>{icon}</div>
        </div>
      </div>
    </article>
  );
}
