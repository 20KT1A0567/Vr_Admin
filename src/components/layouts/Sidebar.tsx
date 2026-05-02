import { ChevronLeft, ChevronsLeftRightEllipsis } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ActionButton } from "components/admin/ActionButton";
import { adminNavGroups, adminSidebarSummary } from "components/layouts/adminNavigation";
import { canViewModule } from "utils/adminAccess";
import { cn } from "utils/cn";
import type { AuthUser } from "types";
import vrTechnologiesLogo from "../../assets/vr-technologies-logo.svg";

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
    <div className="flex h-full flex-col gap-5">
      <div
        className={cn(
          "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(2,6,23,0.18)]",
          collapsed && !mobile ? "px-3" : undefined
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#6d28d9,#2563eb)] shadow-[0_16px_24px_rgba(79,70,229,0.35)]">
            <img src={vrTechnologiesLogo} alt="VR Technologies logo" className="h-9 w-9 object-contain" />
          </div>
          {!collapsed || mobile ? (
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-[-0.02em] text-white">{adminSidebarSummary.title}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">Operations Console</div>
            </div>
          ) : null}
          {!mobile ? (
            <ActionButton className="ml-auto border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white" size="icon" variant="ghost" onClick={onToggleCollapse}>
              {collapsed ? <ChevronsLeftRightEllipsis className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </ActionButton>
          ) : null}
        </div>
      </div>

      <nav className="admin-scrollbar flex-1 space-y-5 overflow-y-auto pr-1">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            {!collapsed || mobile ? <div className="admin-sidebar-label px-3">{group.title}</div> : null}
            <div className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  title={collapsed && !mobile ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "admin-sidebar-link",
                      collapsed && !mobile ? "justify-center px-0" : undefined,
                      isActive ? "admin-sidebar-link-active" : "admin-sidebar-link-idle"
                    )
                  }
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  {!collapsed || mobile ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-inherit/60">{item.description}</span>
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(109,40,217,0.22),rgba(255,255,255,0.04))] p-4">
        <div className={cn("flex items-center gap-3", collapsed && !mobile ? "justify-center" : undefined)}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#8b5cf6,#4f46e5)] text-base font-bold text-white">
            {(user?.name?.slice(0, 1) ?? "A").toUpperCase()}
          </div>
          {!collapsed || mobile ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user?.name ?? "Admin user"}</div>
              <div className="truncate text-xs text-slate-300">{user?.roleName ?? user?.role ?? "Admin"}</div>
            </div>
          ) : null}
          {!collapsed || mobile ? (
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.14]"
              onClick={onLogout}
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
