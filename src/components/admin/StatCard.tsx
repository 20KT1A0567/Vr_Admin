import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  meta: string;
  icon: ReactNode;
  accentClassName?: string;
}

export function StatCard({ label, value, meta, icon, accentClassName = "bg-emerald-50 text-emerald-700" }: StatCardProps) {
  return (
    <article className="admin-kpi-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="admin-kpi-value">{value}</div>
          <p className="admin-kpi-meta">{meta}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accentClassName}`}>{icon}</div>
      </div>
    </article>
  );
}
