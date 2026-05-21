import React from "react";
import { motion } from "framer-motion";
import { cn } from "utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  glow?: boolean;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function Card({
  children,
  className,
  gradient,
  glow,
  title,
  subtitle,
  headerAction
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] backdrop-blur-xl shadow-2xl transition-all duration-300",
        glow && "shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] border-[color:var(--color-primary)]/30",
        className
      )}
    >
      {gradient && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500" />
      )}
      
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] p-5 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-base font-bold tracking-tight text-[color:var(--color-text-primary)] sm:text-lg">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs font-medium text-[color:var(--color-text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="ml-4 shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      
      <div className="p-5 sm:p-6 text-[color:var(--color-text-primary)]">
        {children}
      </div>
    </motion.div>
  );
}
