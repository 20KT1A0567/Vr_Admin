import type { ReactNode } from "react";

interface FormFieldProps {
  children: ReactNode;
  hint?: string;
  label: string;
  required?: boolean;
}

export function FormField({ children, hint, label, required }: FormFieldProps) {
  return (
    <label className="block">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        <span>{label}</span>
        {required ? <span className="text-rose-500">*</span> : null}
      </div>
      {children}
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p> : null}
    </label>
  );
}
