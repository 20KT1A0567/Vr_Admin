import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { cn } from "utils/cn";

interface FormSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}

export function FormSection({ actions, children, className, description, title }: FormSectionProps) {
  return (
    <Paper component="section" elevation={0} className={cn("admin-form-section p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-[color:var(--color-text)]">{title}</h3>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--color-text-subtle)]">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </Paper>
  );
}
