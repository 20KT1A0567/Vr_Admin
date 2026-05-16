import { useEffect, useRef, useState } from "react";
import { Box, Paper } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, ChevronRight, Clock3, Menu, Monitor, Moon, Search, Settings, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
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
    if (!notificationsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const formattedTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const formattedDate = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const breadcrumbNav = (
    <nav className="admin-breadcrumb flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] leading-tight">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={`${crumb.path}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" /> : null}
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-slate-100">{crumb.label}</span>
            ) : (
              <Link className="text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" to={crumb.path}>
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <Paper component="header" elevation={0} className="admin-topbar-shell">
      <Box className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
        <ActionButton className="shrink-0 lg:hidden" size="icon" variant="ghost" onClick={onOpenMobileMenu}>
          <Menu className="h-4 w-4" />
        </ActionButton>

        <Box className="min-w-0 shrink-0">
          {breadcrumbNav}
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{intro.title}</div>
        </Box>

        <Box className="hidden min-w-0 flex-1 lg:block">
          <label className="relative block w-full max-w-[460px] xl:max-w-[520px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input admin-topbar-search w-full pl-11"
              placeholder={searchPlaceholder ?? "Search dashboard, orders, customers..."}
            />
          </label>
        </Box>

        <Box className="ml-auto flex shrink-0 items-center gap-2">
          <div className="admin-topbar-status-chip hidden xl:inline-flex">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{formattedTime}</span>
            <span className="opacity-60">{formattedDate}</span>
          </div>

          <div className="admin-mode-switch hidden md:flex">
            {themeModes.map((mode) => {
              const Icon = mode.icon;
              const active = themeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={cn("admin-mode-option", active ? "admin-mode-option-active" : undefined)}
                  onClick={() => setThemeMode(mode.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              className="admin-topbar-icon relative"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </button>
            {notificationsOpen ? (
              <div className="admin-profile-menu absolute right-0 top-[calc(100%+0.55rem)] z-40 w-[min(22rem,calc(100vw-2rem))] p-3">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <div>
                    <div className="text-sm font-black text-slate-950 dark:text-slate-50">Notifications</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread of {notifications.length}</div>
                  </div>
                  <Link className="text-xs font-bold text-[#2563EB]" to="/notifications" onClick={() => setNotificationsOpen(false)}>
                    View all
                  </Link>
                </div>
                {unreadCount ? (
                  <button className="mt-2 text-xs font-bold text-slate-500 hover:text-[#2563EB]" onClick={() => markAllRead.mutate()} type="button">
                    Mark all as read
                  </button>
                ) : null}
                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                  {notifications.slice(0, 5).length ? (
                    notifications.slice(0, 5).map((item) => (
                      <div key={item.id} className={`rounded-xl px-3 py-2.5 ${item.read ? "bg-slate-50 dark:bg-slate-900" : "bg-blue-50 dark:bg-slate-800/70"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{item.eventType}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">{item.status}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.subject || item.message || item.channel}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">No notifications yet.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Link to="/settings" className="admin-topbar-icon hidden md:inline-flex" aria-label="Settings" title="Open settings">
            <Settings className="h-4 w-4" />
          </Link>

          <button type="button" className="admin-profile-button hidden min-w-[140px] items-center justify-between gap-2 rounded-[14px] px-3 md:inline-flex">
            <div className="min-w-0 text-left">
              <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Workspace</div>
              <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{intro.eyebrow}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </Box>
      </Box>
    </Paper>
  );
}
