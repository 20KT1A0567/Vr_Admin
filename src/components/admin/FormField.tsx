import type { ReactNode } from "react";
import { FormControl, FormHelperText, FormLabel } from "@mui/material";

interface FormFieldProps {
  children: ReactNode;
  hint?: string;
  label: string;
  required?: boolean;
}

export function FormField({ children, hint, label, required }: FormFieldProps) {
  return (
    <FormControl component="label" className="block w-full">
      <FormLabel className="!mb-2.5 !flex !items-center !gap-2 !text-[11px] !font-semibold !uppercase !tracking-[0.24em] !text-[color:var(--color-text-subtle)]">
        <span>{label}</span>
        {required ? <span className="text-rose-500">*</span> : null}
      </FormLabel>
      {children}
      {hint ? <FormHelperText className="!ml-0 !mt-2 !text-xs !leading-5 !text-[color:var(--color-text-subtle)]">{hint}</FormHelperText> : null}
    </FormControl>
  );
}
