import type { ReactNode } from "react";
import { useEffect } from "react";
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
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl"
} as const;

export function SlideOverDrawer({
  children,
  footer,
  onClose,
  open,
  subtitle,
  title,
  width = "md"
}: SlideOverDrawerProps) {
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
      <aside
        className={cn(
          "admin-drawer-in relative z-10 flex h-full w-full flex-col border-l border-white/80 bg-[linear-gradient(180deg,rgba(252,253,255,0.98)_0%,rgba(244,248,255,0.98)_100%)] shadow-[0_34px_100px_rgba(15,23,42,0.22)]",
          widthClassName[width]
        )}
      >
        <header className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.14),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="admin-pill">Workspace panel</div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
              {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
            </div>
            <ActionButton aria-label="Close drawer" size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </ActionButton>
          </div>
        </header>
        <div className="admin-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        {footer ? (
          <footer className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.96)_100%)] px-5 py-4 shadow-[0_-16px_40px_rgba(15,23,42,0.06)] sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
