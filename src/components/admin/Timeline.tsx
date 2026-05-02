import type { ReactNode } from "react";
import { cn } from "utils/cn";

export interface TimelineItem {
  description?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}

interface TimelineProps {
  className?: string;
  items: TimelineItem[];
}

const dotClassName = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400"
} as const;

const cardClassName = {
  success: "border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)]",
  warning: "border-amber-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)]",
  danger: "border-rose-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff1f2_100%)]",
  info: "border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]",
  neutral: "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
} as const;

export function Timeline({ className, items }: TimelineProps) {
  return (
    <ol className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <li key={index} className="relative pl-8">
          <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center">
            <span className={cn("h-2.5 w-2.5 rounded-full", dotClassName[item.tone ?? "neutral"])} />
          </span>
          {index < items.length - 1 ? (
            <span className="absolute left-[7px] top-5 h-[calc(100%-0.25rem)] w-px bg-[linear-gradient(180deg,rgba(148,163,184,0.38),rgba(226,232,240,0.7))]" />
          ) : null}
          <div className={cn("rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(148,163,184,0.12)]", cardClassName[item.tone ?? "neutral"])}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="font-semibold text-slate-950">{item.title}</div>
              {item.meta ? <div className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.meta}</div> : null}
            </div>
            {item.description ? <div className="mt-2 text-sm leading-7 text-slate-500">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
