import { useEffect } from "react";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
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

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { className: "!bg-slate-950/60 backdrop-blur-md" },
        paper: { className: "admin-dialog-surface admin-fade-in !m-4 !max-w-lg" }
      }}
    >
      <DialogContent className="!px-6 !py-6 sm:!px-7">
        <div className={cn("admin-pill", tone === "danger" ? "border-rose-300/45 bg-rose-500/10 text-rose-500" : "border-amber-300/45 bg-amber-500/10 text-amber-500")}>
          {tone === "danger" ? "Destructive action" : "Please confirm"}
        </div>
        <div className="mt-5 flex items-start gap-4">
          <div className={cn("admin-dialog-icon", tone === "danger" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500")}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[1.35rem] font-extrabold text-[color:var(--color-text)]">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-subtle)]">{description}</p>
          </div>
        </div>
      </DialogContent>
      <DialogActions className="admin-dialog-footer flex justify-end gap-3">
        <ActionButton variant="ghost" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
}
