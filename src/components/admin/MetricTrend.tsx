import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "utils/cn";

type MetricTrendDirection = "up" | "down" | "flat";

interface MetricTrendProps {
  className?: string;
  direction?: MetricTrendDirection;
  value: string;
}

const directionClassName: Record<MetricTrendDirection, string> = {
  up: "border-emerald-200 bg-emerald-50 text-emerald-700",
  down: "border-rose-200 bg-rose-50 text-rose-700",
  flat: "border-slate-200 bg-slate-100 text-slate-500"
};

const directionIcon: Record<MetricTrendDirection, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus
};

export function MetricTrend({ className, direction = "flat", value }: MetricTrendProps) {
  const Icon = directionIcon[direction];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        directionClassName[direction],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}
