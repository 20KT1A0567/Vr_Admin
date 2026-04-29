import { Bell, Boxes, Building2, LayoutDashboard, LogOut, MapPinned, Menu, MessageSquareMore, PackageSearch, Search, Settings, ShieldCheck, Tags, TicketPercent, Users } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "store/authStore";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
};

const mainSections: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Products", icon: PackageSearch, to: "/products" },
  { label: "Categories", icon: Tags, to: "/categories" },
  { label: "Brands", icon: ShieldCheck, to: "/brands" },
  { label: "Orders", icon: Boxes, to: "/orders" },
  { label: "Customers", icon: Users, to: "/customers" },
  { label: "Stores", icon: MapPinned, to: "/stores" },
  { label: "Banners", icon: Building2, to: "/banners" }
];

const supportSections: NavItem[] = [
  { label: "Inventory", icon: PackageSearch, to: "/inventory" },
  { label: "Enquiries", icon: MessageSquareMore, to: "/enquiries" },
  { label: "Coupons", icon: TicketPercent, to: "/coupons" },
  { label: "Users & Roles", icon: Users, to: "/roles" },
  { label: "Settings", icon: Settings, to: "/settings" }
];

function formatTitle(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `admin-sidebar-link ${isActive ? "admin-sidebar-link-active" : "admin-sidebar-link-idle"}`}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AdminLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent p-4 lg:p-5">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[1.9rem] bg-[linear-gradient(180deg,#081b34,#0d274a)] p-4 text-white shadow-[0_24px_70px_rgba(8,27,52,0.32)]">
          <div className="flex h-full flex-col">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e] font-bold text-[#081b34]">VR</div>
                <div>
                  <div className="admin-display text-lg font-bold leading-none text-white">VR Technologies</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/40">Admin panel</div>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              <div>
                <div className="admin-sidebar-label px-3">Main</div>
                <div className="mt-2 space-y-1">
                  {mainSections.map((item) => (
                    <SidebarLink key={item.to} item={item} />
                  ))}
                </div>
              </div>

              <div>
                <div className="admin-sidebar-label px-3">Operations</div>
                <div className="mt-2 space-y-1">
                  {supportSections.map((item) => (
                    <SidebarLink key={item.to} item={item} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(34,197,94,0.16),rgba(255,255,255,0.04))] p-4">
              <div className="text-sm font-semibold text-white">Need help?</div>
              <p className="mt-2 text-sm leading-6 text-white/60">Keep catalog, orders, and homepage campaigns aligned from one admin console.</p>
              <button className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#081b34]" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <header className="admin-shell flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <button className="admin-topbar-icon">
                <Menu className="h-4 w-4" />
              </button>
              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 sm:block">
                All Stores
              </div>
              <div className="hidden text-sm text-slate-500 lg:block">{formatTitle(location.pathname)}</div>
            </div>

            <div className="relative min-w-[280px] flex-1 max-w-[520px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="admin-input pl-11" placeholder="Search products, orders, customers..." />
            </div>

            <div className="flex items-center gap-3">
              <button className="admin-topbar-icon">
                <Settings className="h-4 w-4" />
              </button>
              <button className="admin-topbar-icon relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-sm font-bold text-white">
                  {user?.name?.slice(0, 1).toUpperCase() ?? "A"}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.name ?? "Admin"}</div>
                  <div className="text-xs text-slate-500">{user?.role === "ADMIN" ? "Super Admin" : user?.role}</div>
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
