import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, Monitor, Moon, Settings, SunMedium, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ActionButton } from "components/admin/ActionButton";
import { cn } from "utils/cn";

interface TopbarProps {
  breadcrumbs: Array<{ label: string; path: string }>;
  intro: {
    description: string;
    eyebrow: string;
    title: string;
  };
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  userEmail?: string;
  profileLabel: string;
  searchPlaceholder?: string;
  userLabel?: string;
  userMetaLabel?: string;
}

type AppearanceMode = "light" | "dark" | "auto";

const APPEARANCE_STATE_KEY = "vrtech-admin-appearance";

function readAppearanceState(): AppearanceMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(APPEARANCE_STATE_KEY);
  return stored === "dark" || stored === "auto" ? stored : "light";
}

export function Topbar({
  breadcrumbs,
  intro,
  onLogout,
  onOpenMobileMenu,
  userEmail,
  profileLabel,
  userLabel,
  userMetaLabel
}: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceMode>(readAppearanceState);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [breadcrumbs]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(APPEARANCE_STATE_KEY, appearance);
  }, [appearance]);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
      <div className="mx-auto max-w-[1760px]">
        <div className="overflow-visible rounded-[26px] border border-slate-200/85 bg-white/92 px-5 py-4 shadow-[0_18px_45px_rgba(148,163,184,0.12)] backdrop-blur-xl sm:px-6 lg:px-7">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <ActionButton className="shrink-0 lg:hidden" size="icon" variant="ghost" onClick={onOpenMobileMenu}>
                  <Menu className="h-4 w-4" />
                </ActionButton>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{intro.eyebrow}</div>
                  <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">{intro.title}</div>
                  <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-slate-500 lg:block">{intro.description}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
                <div className="flex items-center gap-2 self-start xl:self-auto">
                  <button className="admin-topbar-icon relative" aria-label="Notifications" type="button">
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      16
                    </span>
                  </button>

                  <div className="admin-mode-switch">
                    {[
                      { key: "light", label: "Light", icon: SunMedium },
                      { key: "dark", label: "Dark", icon: Moon },
                      { key: "auto", label: "Auto", icon: Monitor }
                    ].map((mode) => {
                      const active = appearance === mode.key;
                      const Icon = mode.icon;

                      return (
                        <button
                          key={mode.key}
                          type="button"
                          className={cn("admin-mode-option", active ? "admin-mode-option-active" : undefined)}
                          onClick={() => setAppearance(mode.key as AppearanceMode)}
                        >
                          <Icon className="h-4 w-4" />
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to="/settings" className="admin-topbar-icon" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                  <div ref={profileRef} className="relative">
                    <button
                      type="button"
                      className="flex min-w-[236px] items-center gap-3 rounded-[20px] border border-blue-200/85 bg-white px-3 py-2.5 text-left shadow-[0_12px_26px_rgba(148,163,184,0.12)] transition hover:border-blue-300"
                      aria-expanded={profileOpen}
                      aria-haspopup="menu"
                      onClick={() => setProfileOpen((current) => !current)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#4f46e5,#2563eb)] text-sm font-bold text-white">
                        {profileLabel}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{userLabel ?? "Admin user"}</div>
                        <div className="truncate text-xs text-slate-500">{userMetaLabel ?? intro.eyebrow}</div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", profileOpen ? "rotate-180" : undefined)} />
                    </button>

                    {profileOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.85rem)] z-20 w-[300px] rounded-[24px] border border-slate-200/85 bg-white p-3 shadow-[0_28px_60px_rgba(15,23,42,0.16)]">
                        <div className="rounded-[20px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(79,70,229,0.08),rgba(56,189,248,0.08))] p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white">
                              <UserCircle2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-950">{userLabel ?? "Admin user"}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">{userEmail ?? "No email available"}</div>
                              <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {userMetaLabel ?? intro.eyebrow}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <Link
                            to="/settings"
                            className="flex items-center justify-between rounded-[16px] px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                            onClick={() => setProfileOpen(false)}
                          >
                            <span>Settings</span>
                            <Settings className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            onClick={() => {
                              setProfileOpen(false);
                              onLogout();
                            }}
                          >
                            <span>Logout</span>
                            <LogOut className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <nav className="admin-breadcrumb hidden items-center gap-x-1.5 gap-y-1 border-t border-slate-200/75 pt-3 text-sm lg:flex">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <div key={crumb.path} className="flex items-center gap-1.5">
                    {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-300" /> : null}
                    {isLast ? (
                      <span className="admin-breadcrumb-current">{crumb.label}</span>
                    ) : (
                      <Link className={cn("transition hover:text-slate-700")} to={crumb.path}>
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
