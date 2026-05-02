import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "components/layouts/AdminLayout";
import { canViewModule, getDefaultAdminRoute } from "utils/adminAccess";
import { AdminOrderDetailPage } from "pages/AdminOrderDetailPage";
import { AdminLoginHistoryPage } from "pages/AdminLoginHistoryPage";
import { AdminUsersPage } from "pages/AdminUsersPage";
import { BannersPage } from "pages/BannersPage";
import { BrandsPage } from "pages/BrandsPage";
import { CategoriesPage } from "pages/CategoriesPage";
import { ContentPage } from "pages/ContentPage";
import { CouponsPage } from "pages/CouponsPage";
import { DashboardPage } from "pages/DashboardPage";
import { EnquiriesPage } from "pages/EnquiriesPage";
import { ForbiddenPage } from "pages/ForbiddenPage";
import { InventoryPage } from "pages/InventoryPage";
import { LoginPage } from "pages/LoginPage";
import { OrdersPage } from "pages/OrdersPage";
import { ProductsPage } from "pages/ProductsPage";
import { RolesPermissionsPage } from "pages/RolesPermissionsPage";
import { SettingsPage } from "pages/SettingsPage";
import { StoresPage } from "pages/StoresPage";
import { UsersPage } from "pages/UsersPage";
import { useAuthStore } from "store/authStore";
import type { AdminModule } from "types";

function ProtectedRoutes() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "USER") {
    return <ForbiddenPage />;
  }
  return <AdminLayout />;
}

function RequireModule({ module, children }: { module: AdminModule; children: JSX.Element }) {
  const user = useAuthStore((state) => state.user);
  return canViewModule(user, module) ? children : <Navigate to="/forbidden" replace />;
}

function IndexRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultAdminRoute(user)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<IndexRedirect />} />
        <Route path="/dashboard" element={<RequireModule module="DASHBOARD"><DashboardPage /></RequireModule>} />
        <Route path="/products" element={<RequireModule module="PRODUCTS"><ProductsPage /></RequireModule>} />
        <Route path="/categories" element={<RequireModule module="CATEGORIES"><CategoriesPage /></RequireModule>} />
        <Route path="/brands" element={<RequireModule module="BRANDS"><BrandsPage /></RequireModule>} />
        <Route path="/banners" element={<RequireModule module="BANNERS"><BannersPage /></RequireModule>} />
        <Route path="/orders" element={<RequireModule module="ORDERS"><OrdersPage /></RequireModule>} />
        <Route path="/orders/:id" element={<RequireModule module="ORDERS"><AdminOrderDetailPage /></RequireModule>} />
        <Route path="/customers" element={<RequireModule module="CUSTOMERS"><UsersPage mode="customers" /></RequireModule>} />
        <Route path="/roles" element={<RequireModule module="CUSTOMERS"><UsersPage mode="roles" /></RequireModule>} />
        <Route path="/admin-users" element={<RequireModule module="ADMINS"><AdminUsersPage /></RequireModule>} />
        <Route path="/roles-permissions" element={<RequireModule module="ADMINS"><RolesPermissionsPage /></RequireModule>} />
        <Route path="/login-history" element={<RequireModule module="ADMINS"><AdminLoginHistoryPage /></RequireModule>} />
        <Route path="/users" element={<Navigate to="/customers" replace />} />
        <Route path="/enquiries" element={<RequireModule module="ENQUIRIES"><EnquiriesPage /></RequireModule>} />
        <Route path="/stores" element={<RequireModule module="STORES"><StoresPage /></RequireModule>} />
        <Route path="/inventory" element={<RequireModule module="INVENTORY"><InventoryPage /></RequireModule>} />
        <Route path="/coupons" element={<RequireModule module="COUPONS"><CouponsPage /></RequireModule>} />
        <Route path="/settings" element={<RequireModule module="SETTINGS"><SettingsPage /></RequireModule>} />
        <Route path="/content" element={<RequireModule module="WEBSITE_CONTENT"><ContentPage focus="all" /></RequireModule>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Route>
    </Routes>
  );
}
