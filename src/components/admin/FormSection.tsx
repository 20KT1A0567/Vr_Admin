import type { ReactNode } from "react";
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
    <section className={cn("admin-card p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{title}</h3>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
