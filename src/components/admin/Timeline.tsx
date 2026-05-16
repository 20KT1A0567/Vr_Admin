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
  info: "bg-sky-500",
  neutral: "bg-indigo-400"
} as const;

const cardClassName = {
  success: "border-emerald-300/40",
  warning: "border-amber-300/40",
  danger: "border-rose-300/40",
  info: "border-sky-300/40",
  neutral: "border-[color:var(--color-border)]"
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
            <span className="absolute left-[7px] top-5 h-[calc(100%-0.25rem)] w-px bg-[linear-gradient(180deg,rgba(129,140,248,0.45),rgba(148,163,184,0.22))]" />
          ) : null}
          <div className={cn("admin-timeline-card p-4", cardClassName[item.tone ?? "neutral"])}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="font-extrabold text-[color:var(--color-text)]">{item.title}</div>
              {item.meta ? (
                <div className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-subtle)]">
                  {item.meta}
                </div>
              ) : null}
            </div>
            {item.description ? <div className="mt-2 text-sm leading-7 text-[color:var(--color-text-subtle)]">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
