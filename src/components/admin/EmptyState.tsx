import type { ReactNode } from "react";
import { Paper } from "@mui/material";
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
    <Paper component="div" elevation={0} className={cn("admin-empty-state", className)}>
      <div className="admin-empty-state-icon">
        {icon ?? <Box className="h-6 w-6" />}
      </div>
      <div>
        <div className="text-lg font-extrabold text-[color:var(--color-text)]">{title}</div>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-7 text-[color:var(--color-text-subtle)]">{description}</p>
        ) : null}
      </div>
      {action}
    </Paper>
  );
}
