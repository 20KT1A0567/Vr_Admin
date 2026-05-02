import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Outlet, useLocation } from "react-router-dom";
import { authApi } from "api/client";
import { formatRole } from "components/admin/StatusChip";
import { Sidebar } from "components/layouts/Sidebar";
import { Topbar } from "components/layouts/Topbar";
import { buildBreadcrumbs, findActiveNavItem, getPageMeta } from "components/layouts/adminNavigation";
import { useAuthStore } from "store/authStore";
import { cn } from "utils/cn";

const SIDEBAR_STATE_KEY = "vrtech-admin-sidebar-collapsed";

function readSidebarState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
}

export function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readSidebarState);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(location.pathname), [location.pathname]);
  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
  const activeItem = useMemo(() => findActiveNavItem(location.pathname), [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  async function handleLogout() {
    const refreshToken = user?.refreshToken;

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      toast.error("The session ended locally, but the server logout request could not be completed.");
    } finally {
      logout();
    }
  }

  return (
    <div className="relative min-h-screen bg-transparent">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.1),transparent_24%),radial-gradient(circle_at_top_right,rgba(15,159,110,0.08),transparent_20%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.06),transparent_24%),linear-gradient(180deg,#f9fcff_0%,#eef4f7_100%)]" />
      <div className="pointer-events-none fixed inset-y-0 left-0 -z-10 hidden w-[380px] bg-[radial-gradient(circle_at_left,rgba(8,15,37,0.16),transparent_72%)] lg:block" />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden border-r border-slate-200/10 bg-[linear-gradient(180deg,#07111f_0%,#0a1627_45%,#091221_100%)] px-4 py-4 shadow-[0_30px_70px_rgba(2,6,23,0.26)] lg:block",
          collapsed ? "w-[116px]" : "w-[320px]"
        )}
      >
        <Sidebar collapsed={collapsed} onLogout={handleLogout} onToggleCollapse={() => setCollapsed((current) => !current)} user={user} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-3 left-3 w-[314px] max-w-[calc(100vw-1.5rem)] rounded-[34px] bg-[linear-gradient(180deg,#07111f_0%,#0a1627_45%,#091221_100%)] p-4 shadow-[0_30px_70px_rgba(2,6,23,0.3)]">
            <Sidebar collapsed={false} mobile onCloseMobile={() => setMobileOpen(false)} onLogout={handleLogout} onToggleCollapse={() => undefined} user={user} />
          </aside>
        </div>
      ) : null}

      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[116px]" : "lg:pl-[320px]")}>
        <Topbar
          breadcrumbs={breadcrumbs}
          intro={{
            eyebrow: pageMeta.eyebrow,
            title: activeItem?.label ?? pageMeta.title,
            description: pageMeta.description
          }}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setMobileOpen(true)}
          profileLabel={user?.name?.slice(0, 1).toUpperCase() ?? "A"}
          userEmail={user?.email}
          searchPlaceholder={`Search ${activeItem?.label?.toLowerCase() ?? "records"}, orders, customers`}
          userLabel={user?.name ?? "Admin"}
          userMetaLabel={user?.roleName ? `${user.roleName}` : user?.role ? formatRole(user.role) : "Admin"}
        />

        <main className="admin-fade-in px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-4">
          <div className="mx-auto max-w-[1760px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
