import { cn } from "utils/cn";

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ className, lines = 3 }: SkeletonLoaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "admin-skeleton-line rounded-2xl",
            index === 0 ? "h-10 w-2/3" : "h-4 w-full",
            index === lines - 1 ? "w-5/6" : undefined
          )}
        />
      ))}
    </div>
  );
}
