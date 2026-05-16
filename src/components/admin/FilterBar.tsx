import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { cn } from "utils/cn";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function FilterBar({ children, className, footer }: FilterBarProps) {
  return (
    <Paper component="section" elevation={0} className={cn("admin-shell-muted overflow-hidden", className)}>
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      {footer ? (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--admin-surface)]/70 px-5 py-3 sm:px-6">{footer}</div>
      ) : null}
    </Paper>
  );
}
