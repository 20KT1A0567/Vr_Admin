import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { ActionButton } from "components/admin/ActionButton";
import { cn } from "utils/cn";

interface ConfirmDialogProps {
  confirmLabel?: string;
  description: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "default" | "danger";
}

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  loading,
  onClose,
  onConfirm,
  open,
  title,
  tone = "default"
}: ConfirmDialogProps) {
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose} />
      <div className="admin-dialog-surface admin-fade-in relative z-10 max-w-lg">
        <div className="px-6 py-6 sm:px-7">
          <div className={cn("admin-pill", tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
            {tone === "danger" ? "Destructive action" : "Please confirm"}
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
                tone === "danger"
                  ? "bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-rose-700"
                  : "bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] text-amber-700"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
            </div>
          </div>
        </div>
        <div className="admin-dialog-footer flex justify-end gap-3">
          <ActionButton variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
