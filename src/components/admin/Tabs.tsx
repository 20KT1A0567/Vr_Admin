import type { ReactNode } from "react";
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
    <div
      className={cn(
        "inline-flex flex-wrap gap-2 rounded-[24px] border border-slate-200/85 bg-white/82 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_26px_rgba(15,23,42,0.05)]",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[18px] px-3.5 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  active ? "bg-white/14 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
