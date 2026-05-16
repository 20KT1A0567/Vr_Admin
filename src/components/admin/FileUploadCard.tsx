import type { ChangeEventHandler, ReactNode } from "react";
import { ButtonBase, Paper } from "@mui/material";
import { ImagePlus } from "lucide-react";
import { cn } from "utils/cn";

interface FileUploadCardProps {
  accept?: string;
  description: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  preview: ReactNode;
  title: string;
  uploading?: boolean;
  valueLabel?: string;
}

export function FileUploadCard({
  accept = "image/*",
  description,
  onChange,
  preview,
  title,
  uploading,
  valueLabel
}: FileUploadCardProps) {
  return (
    <Paper component="div" elevation={0} className="admin-upload-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="admin-section-label">{title}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-text-subtle)]">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {valueLabel ? <span className="text-xs font-medium text-[color:var(--color-text-subtle)]">{valueLabel}</span> : null}
          <ButtonBase
            component="label"
            focusRipple
            className={cn(
              "admin-button-secondary inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 px-[18px] py-2.5 text-sm font-semibold transition duration-200",
              uploading && "cursor-not-allowed opacity-60"
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
            <input accept={accept} className="hidden" disabled={uploading} type="file" onChange={onChange} />
          </ButtonBase>
        </div>
      </div>
      <div className="admin-upload-preview mt-4">{preview}</div>
    </Paper>
  );
}
