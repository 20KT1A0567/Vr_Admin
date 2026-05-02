import type { ChangeEventHandler, ReactNode } from "react";
import { ImagePlus } from "lucide-react";
import { ActionButton } from "components/admin/ActionButton";

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
    <div className="admin-upload-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="admin-section-label">{title}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {valueLabel ? <span className="text-xs font-medium text-slate-400">{valueLabel}</span> : null}
          <label>
            <ActionButton className="cursor-pointer" variant="secondary">
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </ActionButton>
            <input accept={accept} className="hidden" disabled={uploading} type="file" onChange={onChange} />
          </label>
        </div>
      </div>
      <div className="admin-upload-preview mt-4">{preview}</div>
    </div>
  );
}
