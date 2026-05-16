import { ChevronLeft, ChevronRight, LogOut, ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router-dom";
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
    <div className="admin-sidebar-inner flex h-full flex-col gap-[18px] p-4">
      <div className={cn("admin-sidebar-brand", collapsed && !mobile ? "px-2 py-3" : "px-3 py-3.5")}>
        <div className={cn("flex items-center gap-3", collapsed && !mobile ? "justify-center" : undefined)}>
          <div className="admin-sidebar-logo shrink-0">
            <img src={vrTechnologiesLogo} alt="VR Technologies" />
          </div>
          {!collapsed || mobile ? (
            <div className="min-w-0 flex-1">
              <div className="admin-sidebar-brand-title">{adminSidebarSummary.title}</div>
              <div className="admin-sidebar-brand-subtitle">Admin Console</div>
            </div>
          ) : null}
          {mobile ? (
            <button
              type="button"
              className="admin-sidebar-icon-btn ml-auto"
              aria-label="Close menu"
              onClick={onCloseMobile}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          {!mobile ? (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn("admin-sidebar-icon-btn ml-auto", collapsed && !mobile ? "hidden" : undefined)}
              onClick={onToggleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {!mobile && collapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            className="admin-sidebar-collapse-mini mt-3"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        {!collapsed || mobile ? (
          <div className="admin-sidebar-status">
            <div className="admin-sidebar-status-copy min-w-0">
              <div className="truncate">{adminSidebarSummary.tagline}</div>
            </div>
            <span className="admin-sidebar-status-pill">Live</span>
          </div>
        ) : null}
      </div>

      <nav className="admin-scrollbar flex-1 space-y-5 overflow-y-auto pr-1">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!collapsed || mobile ? (
              <div className="admin-sidebar-group-header">
                <span className="admin-sidebar-label">{group.title}</span>
              </div>
            ) : null}
            <div className="admin-sidebar-group-list">
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
                  {({ isActive }) => (
                    <>
                      <span className="admin-sidebar-active-rail" aria-hidden />
                      <span className={cn("admin-sidebar-link-icon", isActive ? "admin-sidebar-link-icon-active" : undefined)}>
                        <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.35} />
                      </span>
                      {!collapsed || mobile ? (
                        <span className="admin-sidebar-link-copy">
                          <span className="admin-sidebar-link-title">{item.label}</span>
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("admin-sidebar-user", collapsed && !mobile ? "px-2 py-3" : "px-3 py-3.5")}>
        <div className={cn("flex items-center gap-3", collapsed && !mobile ? "flex-col" : undefined)}>
          <div className="admin-sidebar-avatar">
            {(user?.name?.slice(0, 1) ?? "A").toUpperCase()}
          </div>
          {!collapsed || mobile ? (
            <div className="admin-sidebar-user-copy">
              <div className="admin-sidebar-user-name">{user?.name ?? "Admin user"}</div>
              <div className="admin-sidebar-user-role">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="truncate">{user?.roleName ?? user?.role ?? "Admin"}</span>
              </div>
            </div>
          ) : null}
          {!collapsed || mobile ? (
            <button type="button" className="admin-sidebar-logout" onClick={onLogout} aria-label="Logout" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
          {collapsed && !mobile ? (
            <button type="button" className="admin-sidebar-logout admin-sidebar-logout-icon" onClick={onLogout} aria-label="Logout" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
