import { Moon, Sun } from "lucide-react";
import { useUiThemeStore } from "store/uiThemeStore";
import { cn } from "utils/cn";

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({ className }: ThemeToggleButtonProps) {
  const mode = useUiThemeStore((state) => state.mode);
  const resolvedDark = useUiThemeStore((state) => state.resolvedDark);
  const toggleTheme = useUiThemeStore((state) => state.toggleTheme);

  const isDark = mode === "auto" ? resolvedDark : mode === "dark";

  return (
    <button
      type="button"
      className={cn("admin-topbar-icon", className)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "auto" ? "Auto theme" : isDark ? "Dark mode" : "Light mode"}
      onClick={() => toggleTheme()}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
