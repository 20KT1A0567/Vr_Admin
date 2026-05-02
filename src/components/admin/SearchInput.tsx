import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "utils/cn";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative min-w-[220px] flex-1", containerClassName)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className={cn("admin-input pl-12", className)} {...props} />
    </div>
  );
}
