import type { InputHTMLAttributes } from "react";
import { InputBase, Paper } from "@mui/material";
import { Search } from "lucide-react";
import { cn } from "utils/cn";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <Paper
      component="div"
      elevation={0}
      className={cn(
        "relative min-w-[220px] flex-1 overflow-hidden rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--admin-surface)]/70",
        containerClassName
      )}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-subtle)]" />
      <InputBase className={cn("admin-input !border-0 !bg-transparent pl-12", className)} inputProps={props} />
    </Paper>
  );
}
