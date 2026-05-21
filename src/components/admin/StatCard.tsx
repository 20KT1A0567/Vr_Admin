import { MetricTrend } from "components/admin/MetricTrend";
import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { cn } from "utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
  accentClassName?: string;
  trend?: "up" | "down" | "neutral" | "flat";
  variant?: "standard" | "glass";
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  meta, 
  icon, 
  accentClassName = "bg-emerald-50 text-emerald-700", 
  trend = "neutral",
  variant = "standard",
  className
}: StatCardProps) {
  const trendDirection = trend === "up" ? "up" : trend === "down" ? "down" : "flat";

  if (variant === "glass") {
    return (
      <article className={cn("admin-metric-card group relative", className)}>
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 group-hover:text-white/80 transition-colors">
              {label}
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-white">
              {value}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/90 ring-1 ring-white/20">
              {meta}
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-xl ring-1 ring-white/30 group-hover:bg-white/20 transition-all group-hover:scale-110">
            {icon}
          </div>
        </div>
      </article>
    );
  }

  return (
    <Paper component="article" elevation={0} className={cn("admin-kpi-card relative overflow-hidden group", className)}>
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,rgba(37,99,235,0),rgba(37,99,235,0.42),rgba(15,159,110,0.28),rgba(37,99,235,0))]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors">{label}</div>
          <div className="admin-kpi-value text-slate-900">{value}</div>
          <div className="admin-kpi-meta flex flex-wrap items-center gap-2">
            <MetricTrend direction={trendDirection} value={meta} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm group-hover:scale-110 transition-transform">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", accentClassName)}>{icon}</div>
        </div>
      </div>
    </Paper>
  );
}
