import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "utils/cn";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type ActionButtonSize = "sm" | "md" | "lg" | "icon";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  size?: ActionButtonSize;
  variant?: ActionButtonVariant;
}

const variantClassName: Record<ActionButtonVariant, string> = {
  primary: "admin-button",
  secondary: "admin-button-secondary",
  ghost: "admin-button-ghost",
  danger: "admin-button-danger",
  success: "admin-button-success",
  warning: "admin-button-warning"
};

const sizeClassName: Record<ActionButtonSize, string> = {
  sm: "!min-h-[38px] !px-3.5 !py-2 text-sm",
  md: "!min-h-[44px] !px-[18px] !py-2.5 text-sm",
  lg: "!min-h-[48px] !px-5 !py-3 text-sm",
  icon: "!h-11 !w-11 !p-0"
};

export function ActionButton({
  children,
  className,
  disabled,
  icon,
  iconRight,
  loading,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[20px] font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        sizeClassName[size],
        className
      )}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}
