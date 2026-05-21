import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@mui/material";
import toast from "react-hot-toast";
import { Outlet, useLocation } from "react-router-dom";
import { authApi } from "api/client";
import { DashboardLayout } from "components/layouts/DashboardLayout";
import { Sidebar } from "components/layouts/Sidebar";
import { Topbar } from "components/layouts/Topbar";
import { buildBreadcrumbs, findActiveNavItem, getPageMeta } from "components/layouts/adminNavigation";
import { useAuthStore } from "store/authStore";
import { cn } from "utils/cn";

const SIDEBAR_STATE_KEY = "vrtech-admin-sidebar-collapsed";

function readSidebarState() {
  if (typeof window === "undefined") return false;
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
  const firstSegment = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const topbarLayout = ["dashboard", "products", "orders", "settings", "reports", "content"].includes(firstSegment) ? "full" : "minimal";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      rootApplyTheme();
      window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // Helper to ensure the root class is correct (though AdminThemeProvider handles this)
  function rootApplyTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.style.backgroundColor = isDark ? '#0b1120' : '#f8fafc';
  }

  async function handleLogout() {
    const refreshToken = user?.refreshToken;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      toast.error("Session ended locally, but server logout failed.");
    } finally {
      logout();
    }
  }

  const sidebarNode = (
    <>
      {/* Desktop Sidebar Rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden border-r border-[color:var(--color-border)] transition-all duration-300 lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar 
          collapsed={collapsed} 
          onLogout={handleLogout} 
          onToggleCollapse={() => setCollapsed(!collapsed)} 
          user={user} 
        />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="lg:hidden"
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            className: "w-64 bg-[color:var(--color-bg)] border-r border-[color:var(--color-border)]"
          }
        }}
      >
        <Sidebar 
          collapsed={false} 
          mobile 
          onCloseMobile={() => setMobileOpen(false)} 
          onLogout={handleLogout} 
          onToggleCollapse={() => undefined} 
          user={user} 
        />
      </Drawer>
    </>
  );

  const topbarNode = (
    <Topbar
      breadcrumbs={breadcrumbs}
      layout={topbarLayout}
      intro={{
        eyebrow: pageMeta.eyebrow,
        title: activeItem?.label ?? pageMeta.title,
        description: pageMeta.description
      }}
      onOpenMobileMenu={() => setMobileOpen(true)}
      searchPlaceholder="Search command center..."
    />
  );

  return (
    <DashboardLayout
      contentColumnClassName={cn(
        "transition-all duration-300",
        collapsed ? "lg:pl-20" : "lg:pl-64"
      )}
      sidebar={sidebarNode}
      topbar={topbarNode}
    >
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 bg-[color:var(--color-bg)]">
        <Outlet />
      </main>
    </DashboardLayout>
  );
}
