import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, ChevronRight, Clock3, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "api/client";
import { useUiThemeStore, type UiThemeMode } from "store/uiThemeStore";
import { cn } from "utils/cn";

const themeModes: Array<{ id: UiThemeMode; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "auto", label: "Auto", icon: Monitor }
];

interface TopbarProps {
  breadcrumbs: Array<{ label: string; path: string }>;
  intro: {
    description: string;
    eyebrow: string;
    title: string;
  };
  layout?: "full" | "minimal";
  onOpenMobileMenu: () => void;
  searchPlaceholder?: string;
}

export function Topbar({ breadcrumbs, intro, onOpenMobileMenu, searchPlaceholder }: TopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const themeMode = useUiThemeStore((state) => state.mode);
  const setThemeMode = useUiThemeStore((state) => state.setMode);
  
  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications-topbar"],
    queryFn: adminApi.getNotifications,
    refetchInterval: 60000
  });

  const unreadCount = notifications.filter((item) => !item.read).length;
  const markAllRead = useMutation({
    mutationFn: adminApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications-topbar"] })
  });

  useEffect(() => {
    setNotificationsOpen(false);
  }, [breadcrumbs]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen]);

  const formattedTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const formattedDate = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 backdrop-blur-xl transition-colors duration-300">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-white/5 text-[color:var(--color-text-muted)] lg:hidden hover:bg-white/10 hover:text-[color:var(--color-text-primary)]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs & Page Info */}
        <div className="hidden min-w-0 flex-col lg:flex">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-text-muted)]">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 text-[color:var(--color-text-muted)] opacity-50" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-[color:var(--color-text-primary)] font-bold">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="hover:text-[color:var(--color-primary)] transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
          <h2 className="mt-0.5 truncate text-sm font-bold text-[color:var(--color-text-primary)] tracking-tight">
            {intro.title}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="hidden max-w-md flex-1 lg:block ml-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)] transition-colors group-focus-within:text-[color:var(--color-primary)]" />
            <input
              type="text"
              placeholder={searchPlaceholder ?? "Search command center..."}
              className="h-10 w-full rounded-xl border border-[color:var(--color-border)] bg-white/5 pl-10 pr-4 text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-primary)]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]/50 transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* Clock */}
          <div className="hidden items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white/5 px-3 py-1.5 xl:flex">
            <Clock3 className="h-3.5 w-3.5 text-[color:var(--color-primary)]" />
            <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{formattedTime}</span>
            <span className="text-[10px] font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">{formattedDate}</span>
          </div>

          {/* Theme Switcher */}
          <div className="hidden items-center gap-1 rounded-lg border border-[color:var(--color-border)] bg-white/5 p-1 md:flex">
            {themeModes.map((mode) => {
              const Icon = mode.icon;
              const active = themeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setThemeMode(mode.id)}
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-md px-2 text-xs font-bold transition-all",
                    active 
                      ? "bg-[color:var(--color-primary)] text-white shadow-lg shadow-[color:var(--color-primary)]/20" 
                      : "text-[color:var(--color-text-muted)] hover:bg-white/5 hover:text-[color:var(--color-text-primary)]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] transition-all",
                notificationsOpen 
                  ? "bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/50 text-[color:var(--color-primary)]" 
                  : "bg-white/5 text-[color:var(--color-text-muted)] hover:bg-white/10 hover:text-[color:var(--color-text-primary)]"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-primary)] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] p-4 shadow-2xl backdrop-blur-xl"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-text-primary)]">Notifications</h3>
                    <Link to="/notifications" className="text-[11px] font-bold text-[color:var(--color-primary)] hover:underline">
                      View All
                    </Link>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="rounded-xl border border-[color:var(--color-border)] bg-white/5 p-3 hover:bg-white/10 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-primary)]">{n.eventType}</span>
                            <span className="text-[10px] text-[color:var(--color-text-muted)]">2m ago</span>
                          </div>
                          <p className="text-xs font-medium text-[color:var(--color-text-secondary)] line-clamp-2">
                            {n.subject || n.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-[color:var(--color-text-muted)]">
                        No new notifications
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile/Workspace */}
          <button className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white/5 pl-2 pr-3 py-1.5 transition-all hover:bg-white/10">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-[10px] font-bold text-white">
              VR
            </div>
            <div className="hidden flex-col items-start xl:flex">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">Workspace</span>
              <span className="text-xs font-bold text-[color:var(--color-text-primary)]">{intro.eyebrow}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-[color:var(--color-text-muted)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
