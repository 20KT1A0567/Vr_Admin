import type { ReactNode } from "react";
import { cn } from "utils/cn";

export interface DashboardLayoutProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
  contentColumnClassName?: string;
}

export function DashboardLayout({ sidebar, topbar, children, contentColumnClassName }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] transition-colors duration-300">
      {sidebar}

      <div className={cn("min-h-screen flex flex-col", contentColumnClassName)}>
        {topbar}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
