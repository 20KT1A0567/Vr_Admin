import React, { type ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children" | "ref"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 border-none",
    secondary: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:from-purple-400 hover:to-indigo-500 border-none",
    outline: "border border-[color:var(--color-border)] bg-white/5 text-[color:var(--color-text-secondary)] hover:bg-white/10 hover:text-[color:var(--color-text-primary)] hover:border-[color:var(--color-text-muted)]",
    ghost: "bg-transparent text-[color:var(--color-text-muted)] hover:bg-white/5 hover:text-[color:var(--color-text-primary)] border-none",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 flex items-center justify-center p-0"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-bold tracking-tight transition-all disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : null}
      {children}
    </motion.button>
  );
}
