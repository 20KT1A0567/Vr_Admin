import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "components/layouts/AdminLayout";
import { canViewModule, getDefaultAdminRoute } from "utils/adminAccess";
import { AdminOrderDetailPage } from "pages/AdminOrderDetailPage";
import { AdminLoginHistoryPage } from "pages/AdminLoginHistoryPage";
import { AdminUsersPage } from "pages/AdminUsersPage";
import { BackInStockRequestsPage } from "pages/BackInStockRequestsPage";
import { BannersPage } from "pages/BannersPage";
import { BrandsPage } from "pages/BrandsPage";
import { CategoriesPage } from "pages/CategoriesPage";
import { CartManagementPage } from "pages/CartManagementPage";
import { ContentPage } from "pages/ContentPage";
import { CouponsPage } from "pages/CouponsPage";
import { Customer360Page } from "pages/Customer360Page";
import { DashboardPage } from "pages/DashboardPage";
import { EnquiriesPage } from "pages/EnquiriesPage";
import { ForbiddenPage } from "pages/ForbiddenPage";
import { InventoryPage } from "pages/InventoryPage";
import { LoginPage } from "pages/LoginPage";
import { OrdersPage } from "pages/OrdersPage";
import { NotificationsPage } from "pages/NotificationsPage";
import { PaymentRecoveryPage } from "pages/PaymentRecoveryPage";
import { PaymentWebhookEventsPage } from "pages/PaymentWebhookEventsPage";
import { ProductsPage } from "pages/ProductsPage";
import { ReportsPage } from "pages/ReportsPage";
import { ReturnsPage } from "pages/ReturnsPage";
import { ReviewsPage } from "pages/ReviewsPage";
import { RolesPermissionsPage } from "pages/RolesPermissionsPage";
import { SecurityPage } from "pages/SecurityPage";
import { SettingsPage } from "pages/SettingsPage";
import { SystemHealthPage } from "pages/SystemHealthPage";
import { StoresPage } from "pages/StoresPage";
import { StockMovementsPage } from "pages/StockMovementsPage";
import { StockTransfersPage } from "pages/StockTransfersPage";
import { UsersPage } from "pages/UsersPage";
import { WishlistManagementPage } from "pages/WishlistManagementPage";
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
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<IndexRedirect />} />
        <Route path="/dashboard" element={<RequireModule module="DASHBOARD"><DashboardPage /></RequireModule>} />
        <Route path="/products" element={<RequireModule module="PRODUCTS"><ProductsPage /></RequireModule>} />
        <Route path="/products/new" element={<RequireModule module="PRODUCTS"><ProductsPage startComposer /></RequireModule>} />
        <Route path="/products/:id/edit" element={<RequireModule module="PRODUCTS"><ProductsPage /></RequireModule>} />
        <Route path="/categories" element={<RequireModule module="CATEGORIES"><CategoriesPage /></RequireModule>} />
        <Route path="/brands" element={<RequireModule module="BRANDS"><BrandsPage /></RequireModule>} />
        <Route path="/banners" element={<RequireModule module="BANNERS"><BannersPage /></RequireModule>} />
        <Route path="/orders" element={<RequireModule module="ORDERS"><OrdersPage /></RequireModule>} />
        <Route path="/orders/:id" element={<RequireModule module="ORDERS"><AdminOrderDetailPage /></RequireModule>} />
        <Route path="/payment-recovery" element={<RequireModule module="ORDERS"><PaymentRecoveryPage /></RequireModule>} />
        <Route path="/payment-webhooks" element={<RequireModule module="ORDERS"><PaymentWebhookEventsPage /></RequireModule>} />
        <Route path="/customers" element={<RequireModule module="CUSTOMERS"><UsersPage mode="customers" /></RequireModule>} />
        <Route path="/customers/:id" element={<RequireModule module="CUSTOMERS"><Customer360Page /></RequireModule>} />
        <Route path="/cart-management" element={<RequireModule module="CUSTOMERS"><CartManagementPage /></RequireModule>} />
        <Route path="/wishlist-management" element={<RequireModule module="CUSTOMERS"><WishlistManagementPage /></RequireModule>} />
        <Route path="/roles" element={<RequireModule module="CUSTOMERS"><UsersPage mode="roles" /></RequireModule>} />
        <Route path="/admin-users" element={<RequireModule module="ADMINS"><AdminUsersPage /></RequireModule>} />
        <Route path="/roles-permissions" element={<RequireModule module="ADMINS"><RolesPermissionsPage /></RequireModule>} />
        <Route path="/login-history" element={<RequireModule module="ADMINS"><AdminLoginHistoryPage /></RequireModule>} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/users" element={<Navigate to="/admin-users" replace />} />
        <Route path="/enquiries" element={<RequireModule module="ENQUIRIES"><EnquiriesPage /></RequireModule>} />
        <Route path="/stores" element={<RequireModule module="STORES"><StoresPage /></RequireModule>} />
        <Route path="/inventory" element={<RequireModule module="INVENTORY"><InventoryPage /></RequireModule>} />
        <Route path="/inventory/movements" element={<RequireModule module="INVENTORY"><StockMovementsPage /></RequireModule>} />
        <Route path="/inventory/transfers" element={<RequireModule module="INVENTORY"><StockTransfersPage /></RequireModule>} />
        <Route path="/inventory/back-in-stock" element={<RequireModule module="INVENTORY"><BackInStockRequestsPage /></RequireModule>} />
        <Route path="/stock" element={<Navigate to="/inventory" replace />} />
        <Route path="/coupons" element={<RequireModule module="COUPONS"><CouponsPage /></RequireModule>} />
        <Route path="/reports" element={<RequireModule module="REPORTS"><ReportsPage /></RequireModule>} />
        <Route path="/returns" element={<RequireModule module="ORDERS"><ReturnsPage /></RequireModule>} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/settings" element={<RequireModule module="SETTINGS"><SettingsPage /></RequireModule>} />
        <Route path="/system-health" element={<RequireModule module="SETTINGS"><SystemHealthPage /></RequireModule>} />
        <Route path="/notifications" element={<RequireModule module="SETTINGS"><NotificationsPage /></RequireModule>} />
        <Route path="/content" element={<RequireModule module="WEBSITE_CONTENT"><ContentPage focus="all" /></RequireModule>} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Route>
    </Routes>
  );
}
