import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { cn } from "utils/cn";

interface PageHeaderProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  variant?: "standard" | "premium";
}

export function PageHeader({ actions, children, className, description, eyebrow, title, variant = "standard" }: PageHeaderProps) {
  if (variant === "premium") {
    return (
      <div className={cn("admin-header-gradient relative overflow-hidden rounded-3xl p-5 mb-5", className)}>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                  {eyebrow}
                </div>
              )}
              <h1 className="mt-3 text-2xl font-black tracking-tighter text-white sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-white/80">
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </div>

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    );
  }

  return (
    <Paper component="section" elevation={0} className={cn("admin-shell admin-page-header overflow-hidden", className)}>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-5xl">
            {eyebrow ? (
              <div className="admin-page-header-eyebrow text-[10px] tracking-widest">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="admin-display mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-[color:var(--color-text)] max-sm:text-lg">
              {title}
            </h2>
            {description ? (
              <div className="mt-1 max-w-4xl text-xs leading-6 text-[color:var(--color-text-subtle)]">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">{actions}</div> : null}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </Paper>
  );
}
