import type { ReactNode } from "react";
import { Box } from "lucide-react";
import { cn } from "utils/cn";

interface EmptyStateProps {
  action?: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({ action, className, description, icon, title }: EmptyStateProps) {
  return (
    <div className={cn("admin-empty-state", className)}>
      <div className="admin-empty-state-icon">
        {icon ?? <Box className="h-6 w-6" />}
      </div>
      <div>
        <div className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{title}</div>
        {description ? <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
