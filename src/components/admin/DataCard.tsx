import type { ReactNode } from "react";
import { cn } from "utils/cn";

interface DataCardProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  headerClassName?: string;
  title?: string;
}

export function DataCard({ action, children, className, description, headerClassName, title }: DataCardProps) {
  return (
    <section className={cn("admin-card-elevated overflow-hidden", className)}>
      {title || description || action ? (
        <header
          className={cn(
            "flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/75 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.94)_100%)] px-5 py-4 sm:px-6",
            headerClassName
          )}
        >
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="bg-white/82 px-5 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}
