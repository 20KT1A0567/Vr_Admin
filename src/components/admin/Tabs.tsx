import type { ReactNode } from "react";
import { ButtonBase } from "@mui/material";
import { cn } from "utils/cn";

export interface TabItem<T extends string> {
  badge?: ReactNode;
  label: string;
  value: T;
}

interface TabsProps<T extends string> {
  className?: string;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  value: T;
}

export function Tabs<T extends string>({ className, items, onChange, value }: TabsProps<T>) {
  return (
    <div className={cn("admin-segmented-control flex-wrap gap-2 rounded-[20px] px-2 py-2", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <ButtonBase
            key={item.value}
            component="button"
            type="button"
            focusRipple
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-[linear-gradient(180deg,var(--color-accent),color-mix(in_srgb,var(--color-accent)_76%,#312e81))] text-white shadow-[0_14px_28px_rgba(79,70,229,0.3)]"
                : "text-[color:var(--color-text-subtle)] hover:bg-[color:var(--admin-surface-muted)] hover:text-[color:var(--color-text)]"
            )}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", active ? "bg-white/14 text-white" : "bg-[color:var(--admin-surface)] text-[color:var(--color-text-subtle)]")}>
                {item.badge}
              </span>
            ) : null}
          </ButtonBase>
        );
      })}
    </div>
  );
}
