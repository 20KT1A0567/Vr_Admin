import { useEffect, useMemo, useState } from "react";
import { Box, Drawer, Paper } from "@mui/material";
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
  const firstSegment = location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const topbarLayout = ["dashboard", "products", "orders", "settings", "reports", "content"].includes(firstSegment) ? "full" : "minimal";

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

  const sidebarNode = (
    <>
      <Paper
        component="aside"
        elevation={0}
        className={cn(
          "admin-sidebar-shell admin-sidebar-rail fixed z-50 hidden flex-col overflow-hidden shadow-2xl transition-[width,min-width] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] lg:flex",
          "left-0 top-0 h-full max-h-[100dvh] w-full rounded-none border-y-0 border-l-0 border-r border-white/10",
          "lg:left-0 lg:top-0 lg:h-[100dvh] lg:max-h-[100dvh] lg:rounded-none lg:border-y-0 lg:border-l-0 lg:border-r lg:border-white/10 lg:shadow-[18px_0_70px_rgba(15,23,42,0.18)]",
          collapsed ? "lg:w-[76px] lg:min-w-[76px] lg:max-w-[76px]" : "lg:w-[260px] lg:min-w-[260px] lg:max-w-[260px]"
        )}
      >
        <Sidebar collapsed={collapsed} onLogout={handleLogout} onToggleCollapse={() => setCollapsed((current) => !current)} user={user} />
      </Paper>

      {mobileOpen ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          className="lg:hidden"
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              className:
                "admin-sidebar-shell absolute inset-y-3 left-3 flex w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[20px] border border-white/10 shadow-2xl"
            }
          }}
        >
          <Box className="flex h-full min-h-0 flex-col">
            <Sidebar collapsed={false} mobile onCloseMobile={() => setMobileOpen(false)} onLogout={handleLogout} onToggleCollapse={() => undefined} user={user} />
          </Box>
        </Drawer>
      ) : null}
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
      searchPlaceholder="Search dashboard, orders, customers..."
    />
  );

  return (
    <DashboardLayout
      contentColumnClassName={cn(
        "transition-[margin] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]",
        /* 20px inset + rail width + 20px gap — must be literal strings for Tailwind JIT */
        collapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
      sidebar={sidebarNode}
      topbar={topbarNode}
    >
      <Outlet />
    </DashboardLayout>
  );
}
