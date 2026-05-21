import { ChevronLeft, LogOut, ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { adminNavGroups, adminSidebarSummary } from "components/layouts/adminNavigation";
import { canViewModule } from "utils/adminAccess";
import { cn } from "utils/cn";
import type { AuthUser } from "types";

interface SidebarProps {
  collapsed: boolean;
  mobile?: boolean;
  onCloseMobile?: () => void;
  onLogout: () => void;
  onToggleCollapse: () => void;
  user: AuthUser | null;
}

export function Sidebar({
  collapsed,
  mobile,
  onCloseMobile,
  onLogout,
  onToggleCollapse,
  user
}: SidebarProps) {
  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.module || canViewModule(user, item.module))
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-[color:var(--color-bg)] text-[color:var(--color-text-primary)] transition-colors duration-300">
      {/* Brand Section */}
      <div className={cn("flex flex-col gap-4 border-b border-[color:var(--color-border)] p-4", collapsed && !mobile ? "items-center" : "")}>
        <div className="flex items-center gap-3">
          
          <AnimatePresence mode="wait">
            {(!collapsed || mobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 overflow-hidden"
              >
                <h1 className="truncate text-sm font-bold tracking-tight">
                  {adminSidebarSummary.title}
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-primary)]">
                  Admin Console
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!mobile && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "hidden h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-white/5 text-[color:var(--color-text-muted)] transition-all hover:bg-white/10 hover:text-[color:var(--color-text-primary)] lg:flex",
                collapsed ? "rotate-180" : ""
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {mobile && (
            <button
              onClick={onCloseMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-white/5 text-[color:var(--color-text-muted)] hover:bg-white/10 hover:text-[color:var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {(!collapsed || mobile) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/5 px-3 py-2"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-primary)] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="truncate text-[11px] font-medium text-[color:var(--color-text-secondary)]">
                {adminSidebarSummary.tagline}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">Live</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 custom-scrollbar">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {(!collapsed || mobile) && (
              <h2 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--color-text-muted)]">
                {group.title}
              </h2>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-r from-[color:var(--color-primary)]/20 to-[color:var(--color-secondary)]/5 text-[color:var(--color-primary)] shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]" 
                        : "text-[color:var(--color-text-secondary)] hover:bg-white/5 hover:text-[color:var(--color-text-primary)]",
                      collapsed && !mobile ? "justify-center px-2" : ""
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-pill"
                          className="absolute inset-y-2 left-0 w-1 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        />
                      )}
                      <item.icon 
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive ? "text-[color:var(--color-primary)]" : "group-hover:text-[color:var(--color-text-primary)]"
                        )} 
                        strokeWidth={isActive ? 2 : 1.5} 
                      />
                      {(!collapsed || mobile) && (
                        <span className="text-sm font-medium tracking-tight">{item.label}</span>
                      )}
                      {collapsed && !mobile && (
                        <div className="absolute left-full ml-4 rounded-md bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] px-2 py-1 text-xs font-medium text-[color:var(--color-text-primary)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="mt-auto border-t border-[color:var(--color-border)] p-4 bg-white/5 backdrop-blur-sm">
        <div className={cn("flex items-center gap-3", collapsed && !mobile ? "flex-col" : "")}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--color-primary)]/20 to-[color:var(--color-secondary)]/20 text-sm font-bold text-[color:var(--color-primary)] ring-1 ring-[color:var(--color-primary)]/30"
          >
            {(user?.name?.slice(0, 1) ?? "A").toUpperCase()}
          </motion.div>
          
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">
                {user?.name ?? "Admin User"}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--color-text-muted)]">
                <ShieldCheck className="h-3 w-3 text-[color:var(--color-success)]" />
                <span className="truncate">{user?.roleName ?? user?.role ?? "Administrator"}</span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-all hover:bg-red-500/20 hover:text-red-400",
              collapsed && !mobile ? "h-8 w-8" : ""
            )}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
