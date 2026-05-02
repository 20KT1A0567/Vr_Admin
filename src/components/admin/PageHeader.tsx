import type { ReactNode } from "react";
import { cn } from "utils/cn";

interface PageHeaderProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}

export function PageHeader({ actions, children, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <section className={cn("admin-shell overflow-hidden", className)}>
      <div className="relative overflow-hidden px-5 py-5 sm:px-6 lg:px-7 lg:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(15,159,110,0.1),transparent_30%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              {eyebrow ? <div className="admin-pill">{eyebrow}</div> : null}
              <h1 className="admin-display mt-4 text-[1.95rem] font-bold leading-tight text-slate-950 sm:text-[2.2rem]">{title}</h1>
              {description ? <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</div> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 xl:max-w-[40%] xl:justify-end">{actions}</div> : null}
          </div>
          {children ? (
            <div className="rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-5">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
