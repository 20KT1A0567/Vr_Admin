import type { ReactNode } from "react";
import { cn } from "utils/cn";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function FilterBar({ children, className, footer }: FilterBarProps) {
  return (
    <section className={cn("admin-shell-muted overflow-hidden", className)}>
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      {footer ? <div className="border-t border-slate-200/70 bg-white/55 px-5 py-3 sm:px-6">{footer}</div> : null}
    </section>
  );
}
