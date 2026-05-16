import { Skeleton } from "@mui/material";
import { cn } from "utils/cn";

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ className, lines = 3 }: SkeletonLoaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          animation="wave"
          variant="rounded"
          className={cn(
            "admin-skeleton-line rounded-2xl !bg-transparent",
            index === 0 ? "h-10 w-2/3" : "h-4 w-full",
            index === lines - 1 ? "w-5/6" : undefined
          )}
        />
      ))}
    </div>
  );
}
