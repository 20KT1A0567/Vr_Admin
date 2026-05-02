import type { ReactNode } from "react";
import { cn } from "utils/cn";

export type StatusBadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "violet";

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  tone?: StatusBadgeTone;
}

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "admin-badge-green",
  warning: "admin-badge-amber",
  danger: "admin-badge-rose",
  info: "admin-badge-sky",
  neutral: "admin-badge-slate",
  violet: "admin-badge-violet"
};

export function StatusBadge({ children, className, dot, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={cn(toneClassName[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current/80" /> : null}
      {children}
    </span>
  );
}
