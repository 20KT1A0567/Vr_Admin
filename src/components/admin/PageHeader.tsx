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
}

export function PageHeader({ actions, children, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <Paper component="section" elevation={0} className={cn("admin-shell admin-page-header overflow-hidden", className)}>
      <div className="px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-5xl">
            {eyebrow ? (
              <div className="admin-page-header-eyebrow">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="admin-display mt-3 text-[32px] font-extrabold leading-tight tracking-tight text-[color:var(--color-text)] max-sm:text-[26px]">
              {title}
            </h2>
            {description ? (
              <div className="mt-2 max-w-4xl text-sm leading-7 text-[color:var(--color-text-subtle)]">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5 xl:justify-end">{actions}</div> : null}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </Paper>
  );
}
