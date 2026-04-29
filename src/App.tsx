import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "components/layouts/AdminLayout";
import { ContentPage } from "pages/ContentPage";
import { CouponsPage } from "pages/CouponsPage";
import { DashboardPage } from "pages/DashboardPage";
import { EnquiriesPage } from "pages/EnquiriesPage";
import { InventoryPage } from "pages/InventoryPage";
import { LoginPage } from "pages/LoginPage";
import { OrdersPage } from "pages/OrdersPage";
import { ProductsPage } from "pages/ProductsPage";
import { SettingsPage } from "pages/SettingsPage";
import { StoresPage } from "pages/StoresPage";
import { UsersPage } from "pages/UsersPage";
import { useAuthStore } from "store/authStore";

function ProtectedRoutes() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<ContentPage focus="categories" />} />
        <Route path="/brands" element={<ContentPage focus="brands" />} />
        <Route path="/banners" element={<ContentPage focus="banners" />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<UsersPage mode="customers" />} />
        <Route path="/roles" element={<UsersPage mode="roles" />} />
        <Route path="/users" element={<Navigate to="/customers" replace />} />
        <Route path="/enquiries" element={<EnquiriesPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/content" element={<Navigate to="/banners" replace />} />
      </Route>
    </Routes>
  );
}
