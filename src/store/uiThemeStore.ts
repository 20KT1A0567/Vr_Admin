import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UiThemeMode = "light" | "dark" | "auto";

/** Color preset (Anusha-style violet default, classic indigo, Dracula accents). */
export type AdminThemePreset = "anusha" | "indigo" | "dracula";

interface UiThemeState {
  mode: UiThemeMode;
  preset: AdminThemePreset;
  resolvedDark: boolean;
  setMode: (mode: UiThemeMode) => void;
  setPreset: (preset: AdminThemePreset) => void;
  setResolvedDark: (value: boolean) => void;
  toggleTheme: () => void;
}

export const useUiThemeStore = create<UiThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      preset: "anusha",
      resolvedDark: false,
      setMode: (mode) => set({ mode }),
      setPreset: (preset) => set({ preset }),
      setResolvedDark: (resolvedDark) => set({ resolvedDark }),
      toggleTheme: () => {
        const { mode, resolvedDark } = get();
        if (mode === "auto") {
          set({ mode: resolvedDark ? "light" : "dark" });
          return;
        }

        set({ mode: mode === "dark" ? "light" : "dark" });
      }
    }),
    {
      name: "vrtech-admin-ui-theme-v3",
      partialize: (state) => ({ mode: state.mode, preset: state.preset })
    }
  )
);
