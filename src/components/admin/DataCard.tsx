import type { ReactNode } from "react";
import { Paper } from "@mui/material";
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
    <Paper component="section" elevation={0} className={cn("admin-card-elevated overflow-hidden", className)}>
      {title || description || action ? (
        <header
          className={cn(
            "admin-datacard-header flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4 sm:px-6",
            headerClassName
          )}
        >
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-extrabold tracking-tight text-[color:var(--color-text)]">{title}</h2> : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--color-text-subtle)]">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="admin-datacard-body px-5 py-4 sm:px-6 sm:py-5">{children}</div>
    </Paper>
  );
}
