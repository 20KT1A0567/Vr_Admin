import type { ReactNode } from "react";
import { Chip } from "@mui/material";
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
    <Chip
      component="span"
      className={cn("!h-auto !font-semibold [&_.MuiChip-label]:!flex [&_.MuiChip-label]:!items-center [&_.MuiChip-label]:!gap-1.5 [&_.MuiChip-label]:!px-0", toneClassName[tone], className)}
      label={
        <>
          {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current/80" /> : null}
          {children}
        </>
      }
      variant="outlined"
    />
  );
}
