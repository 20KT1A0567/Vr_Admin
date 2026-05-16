import type { ReactNode } from "react";
import { useEffect } from "react";
import { Drawer as MuiDrawer } from "@mui/material";
import { X } from "lucide-react";
import { ActionButton } from "components/admin/ActionButton";
import { cn } from "utils/cn";

interface SlideOverDrawerProps {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  subtitle?: string;
  title: string;
  width?: "sm" | "md" | "lg" | "xl";
}

const widthClassName = {
  sm: "!max-w-lg",
  md: "!max-w-2xl",
  lg: "!max-w-4xl",
  xl: "!max-w-6xl"
} as const;

export function SlideOverDrawer({ children, footer, onClose, open, subtitle, title, width = "md" }: SlideOverDrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { className: "!bg-slate-950/60 backdrop-blur-md" },
        paper: {
          className: cn("admin-drawer-in admin-drawer-surface flex h-full w-full flex-col", widthClassName[width])
        }
      }}
    >
      <header className="admin-drawer-header px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="admin-pill">Workspace panel</div>
            <h2 className="mt-3 text-xl font-extrabold text-[color:var(--color-text)]">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--color-text-subtle)]">{subtitle}</p> : null}
          </div>
          <ActionButton aria-label="Close drawer" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </ActionButton>
        </div>
      </header>
      <div className="admin-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      {footer ? <footer className="admin-drawer-footer px-5 py-4 sm:px-6">{footer}</footer> : null}
    </MuiDrawer>
  );
}
