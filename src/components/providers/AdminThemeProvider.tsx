import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect, useMemo, type ReactNode } from "react";
import { useUiThemeStore } from "store/uiThemeStore";
import { createAdminTheme } from "theme/adminTheme";

interface AdminThemeProviderProps {
  children: ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const mode = useUiThemeStore((state) => state.mode);
  const preset = useUiThemeStore((state) => state.preset);
  const resolvedDark = useUiThemeStore((state) => state.resolvedDark);
  const setResolvedDark = useUiThemeStore((state) => state.setResolvedDark);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function update() {
      const effectiveDark = mode === "auto" ? mediaQuery.matches : mode === "dark";
      setResolvedDark(effectiveDark);
    }

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [mode, setResolvedDark]);

  const isDark = mode === "auto" ? resolvedDark : mode === "dark";
  const theme = useMemo(() => createAdminTheme(isDark ? "dark" : "light"), [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.adminPreset = preset;
    root.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark-theme", isDark);
    document.body.classList.toggle("light-theme", !isDark);
    document.body.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark, preset]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
