import axios, { type InternalAxiosRequestConfig } from "axios";
import type {
  AdminActivityLogEntry,
  AdminCreatePayload,
  AdminLoginHistoryEntry,
  AdminPermissions,
  AdminCartItem,
  AdminSession,
  AdminStatus,
  AdminUpdatePayload,
  AdminUser,
  AdminWishlistItem,
  ApiEnvelope,
  AuthUser,
  BackupCodeStatus,
  CartRecoveryResult,
  Customer360,
  LoginResult,
  ProductAuditEntry,
  ShipmentUpdatePayload,
  TwoFactorChallenge,
  AdminProductListFilters,
  AdminStorePerformance,
  BackInStockRequest,
  Banner,
  Brand,
  Category,
  Coupon,
  DashboardStats,
  Enquiry,
  Order,
  PageResponse,
  PaymentRecoveryResult,
  PaymentWebhookEvent,
  PermissionCatalog,
  Product,
  ProductBulkActionPayload,
  ProductReview,
  ProductReviewPayload,
  ProductImportResponse,
  ProductSection,
  RazorpaySettings,
  RefundTransaction,
  ReturnRequest,
  ReturnRequestStatus,
  Role,
  RolePermissionEntry,
  RolePermissions,
  SiteSettings,
  StockMovement,
  StockMovementType,
  StockTransfer,
  StockTransferPayload,
  Store,
  SystemHealth,
  UserSummary,
  NotificationLog,
  CouponAnalytics,
  AdminActivitySummary
} from "types";
import { useAuthStore } from "store/authStore";

function normalizeApiBaseUrl(value?: string) {
  const baseUrl = (value?.trim() || "https://vr.anushatechnologies.com").replace(/\/+$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: apiBaseUrl
});

const AUTH_STORAGE_KEY = "vrtech-admin-auth";
let refreshPromise: Promise<AuthUser> | null = null;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function readPersistedUser() {
  const stateUser = useAuthStore.getState().user;
  if (stateUser) {
    return stateUser;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { state?: { user?: AuthUser | null } };
    return parsed.state?.user ?? null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  const user = readPersistedUser();
  if (user?.token) {
    return user.token;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const directTokenKeys = ["token", "accessToken", "jwt", "authToken", "vrtech-admin-token"];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of directTokenKeys) {
      const token = storage.getItem(key);
      if (token) {
        return token;
      }
    }
  }

  return null;
}

function setPersistedUser(user: AuthUser | null) {
  if (user) {
    useAuthStore.getState().setUser(user);
    return;
  }
  useAuthStore.getState().logout();
}

function isAuthRefreshBypassed(url?: string) {
  if (!url) {
    return false;
  }
  return ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout"].some((path) => url.includes(path));
}

async function refreshAccessToken() {
  const refreshToken = readPersistedUser()?.refreshToken;
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }
  if (!refreshPromise) {
    refreshPromise = api
      .post<ApiEnvelope<AuthUser>>("/auth/refresh", { refreshToken })
      .then(({ data }) => {
        setPersistedUser(data.data);
        return data.data;
      })
      .catch((error) => {
        setPersistedUser(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const requestConfig = error.config as RetryableRequestConfig;
    if (error.response?.status === 401 && !requestConfig._retry && !isAuthRefreshBypassed(requestConfig.url)) {
      requestConfig._retry = true;

      try {
        const refreshedUser = await refreshAccessToken();
        requestConfig.headers = requestConfig.headers ?? {};
        requestConfig.headers.Authorization = `Bearer ${refreshedUser.token}`;
        return api(requestConfig);
      } catch (refreshError) {
        setPersistedUser(null);
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const unwrap = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>) => (await promise).data.data;

function validationMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const messages = Object.values(data as Record<string, unknown>).filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return messages.length ? messages.join(", ") : null;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    const details = validationMessage(payload?.data);

    if (details) {
      return payload?.message === "Validation failed" ? details : `${payload?.message ?? fallback}: ${details}`;
    }

    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }

    if (!error.response && error.message === "Network Error") {
      return "Cannot reach the backend API. Check VITE_API_BASE_URL and allow this admin domain in backend CORS.";
    }

    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export const authApi = {
  login: (payload: { email: string; password: string }) => unwrap<LoginResult>(api.post("/auth/login", payload)),
  verifyTwoFactor: (payload: { challengeId: string; code: string }) =>
    unwrap<AuthUser>(api.post("/auth/2fa/verify", payload)),
  resendTwoFactor: (challengeId: string) =>
    unwrap<TwoFactorChallenge>(api.post("/auth/2fa/resend", { challengeId })),
  verifyBackupCode: (payload: { challengeId: string; backupCode: string }) =>
    unwrap<AuthUser>(api.post("/auth/2fa/backup", payload)),
  refresh: (refreshToken: string) => unwrap<AuthUser>(api.post("/auth/refresh", { refreshToken })),
  logout: (refreshToken: string) => unwrap(api.post("/auth/logout", { refreshToken })),
  me: () => unwrap<AuthUser>(api.get("/auth/me"))
};

export const accountSecurityApi = {
  listSessions: () => unwrap<AdminSession[]>(api.get("/admin/me/sessions")),
  revokeSession: (sessionId: number) => unwrap(api.delete(`/admin/me/sessions/${sessionId}`)),
  revokeOtherSessions: () => unwrap(api.post("/admin/me/sessions/revoke-others")),
  backupCodeStatus: () => unwrap<BackupCodeStatus>(api.get("/admin/me/backup-codes")),
  regenerateBackupCodes: () => unwrap<BackupCodeStatus>(api.post("/admin/me/backup-codes/regenerate"))
};

export const adminApi = {
  getDashboard: (period?: string) => unwrap<DashboardStats>(api.get("/admin/dashboard", { params: period ? { period } : undefined })),
  getActivitySummary: () => unwrap<AdminActivitySummary>(api.get("/admin/activity-summary")),
  getBrands: () => unwrap<Brand[]>(api.get("/admin/brands")),
  getCategories: () => unwrap<Category[]>(api.get("/admin/categories")),
  getStores: () => unwrap<Store[]>(api.get("/admin/stores")),
  getStorePerformance: (period?: string) => unwrap<AdminStorePerformance[]>(api.get("/admin/stores/performance", { params: period ? { period } : undefined })),
  getBanners: () => unwrap<Banner[]>(api.get("/admin/banners")),
  getProducts: (params?: AdminProductListFilters) => unwrap<Product[]>(api.get("/admin/products", { params })),
  getProduct: (id: number) => unwrap<Product>(api.get(`/admin/products/${id}`)),
  createProduct: (payload: unknown) => unwrap<Product>(api.post("/admin/products", payload)),
  updateProduct: (id: number, payload: unknown) => unwrap<Product>(api.put(`/admin/products/${id}`, payload)),
  getProductSections: () => unwrap<ProductSection[]>(api.get("/admin/product-sections")),
  getProductSection: (id: number) => unwrap<ProductSection>(api.get(`/admin/product-sections/${id}`)),
  createProductSection: (payload: unknown) => unwrap<ProductSection>(api.post("/admin/product-sections", payload)),
  updateProductSection: (id: number, payload: unknown) => unwrap<ProductSection>(api.put(`/admin/product-sections/${id}`, payload)),
  deleteProductSection: (id: number) => unwrap(api.delete(`/admin/product-sections/${id}`)),
  bulkProductAction: (payload: ProductBulkActionPayload) => unwrap(api.patch("/admin/products/bulk", payload)),
  duplicateProduct: (id: number) => unwrap<Product>(api.post(`/admin/products/${id}/duplicate`)),
  deleteProduct: (id: number) => unwrap(api.delete(`/admin/products/${id}`)),
  exportProducts: async () => {
    const response = await api.get("/admin/products/export", { responseType: "blob" });
    return response.data as Blob;
  },
  exportOrders: async () => {
    const response = await api.get("/admin/orders/export", { responseType: "blob" });
    return response.data as Blob;
  },
  exportCustomers: async () => {
    const response = await api.get("/admin/users/export", { responseType: "blob" });
    return response.data as Blob;
  },
  exportInventoryMovements: async () => {
    const response = await api.get("/admin/inventory/movements/export", { responseType: "blob" });
    return response.data as Blob;
  },
  exportBackupZip: async () => {
    const response = await api.get("/admin/export-center/backup.zip", { responseType: "blob" });
    return response.data as Blob;
  },
  importProducts: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap<ProductImportResponse>(api.post("/admin/products/import", formData));
  },
  uploadProductImage: async (productId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap<Product>(api.post(`/admin/products/${productId}/images`, formData));
  },
  deleteProductImage: (productId: number, imageId: number) => unwrap<Product>(api.delete(`/admin/products/${productId}/images/${imageId}`)),
  getProductAudit: (productId: number, page = 0, size = 20) =>
    unwrap<PageResponse<ProductAuditEntry>>(api.get(`/admin/products/${productId}/audit`, { params: { page, size } })),
  getOrders: () => unwrap<Order[]>(api.get("/admin/orders")),
  getOrdersFiltered: (params?: { startDate?: string; endDate?: string }) => unwrap<Order[]>(api.get("/admin/orders", { params })),
  getOrder: (id: number) => unwrap<Order>(api.get(`/admin/orders/${id}`)),
  updateOrderStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/status`, { value })),
  updatePaymentStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/payment-status`, { value })),
  updateShipment: (id: number, payload: ShipmentUpdatePayload) => unwrap<Order>(api.patch(`/admin/orders/${id}/shipment`, payload)),
  getReturns: (status?: ReturnRequestStatus) => unwrap<ReturnRequest[]>(api.get("/admin/returns", { params: status ? { status } : undefined })),
  approveReturn: (id: number, note?: string) => unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/approve`, { note })),
  rejectReturn: (id: number, note?: string) => unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/reject`, { note })),
  refundReturn: (id: number, note?: string) => unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/refund`, { note })),
  scheduleReturnPickup: (id: number, payload: { pickupScheduledAt?: string; pickupAgent?: string; pickupTrackingNumber?: string; note?: string }) =>
    unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/pickup`, payload)),
  markReturnPickedUp: (id: number, note?: string) => unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/picked-up`, { note })),
  inspectReturn: (id: number, note?: string) => unwrap<ReturnRequest>(api.patch(`/admin/returns/${id}/inspect`, { note })),
  getOrderRefunds: (id: number) => unwrap<RefundTransaction[]>(api.get(`/admin/orders/${id}/refunds`)),
  getPaymentWebhookEvents: () => unwrap<PaymentWebhookEvent[]>(api.get("/admin/payments/webhook-events")),
  downloadOrderInvoice: async (id: number) => {
    const response = await api.get(`/admin/orders/${id}/invoice`, { responseType: "blob" });
    return response.data as Blob;
  },
  getUsers: () => unwrap<UserSummary[]>(api.get("/admin/users")),
  getCustomer360: (customerId: number) => unwrap<Customer360>(api.get(`/admin/customers/${customerId}/profile`)),
  getStockMovements: () => unwrap<StockMovement[]>(api.get("/admin/inventory/movements")),
  getStockTransfers: () => unwrap<StockTransfer[]>(api.get("/admin/inventory/transfers")),
  getBackInStockRequests: () => unwrap<BackInStockRequest[]>(api.get("/admin/back-in-stock-requests")),
  updateBackInStockRequestStatus: (id: number, value: string) => unwrap<BackInStockRequest>(api.patch(`/admin/back-in-stock-requests/${id}/status`, { value })),
  deleteBackInStockRequest: (id: number) => unwrap(api.delete(`/admin/back-in-stock-requests/${id}`)),
  adjustStock: (payload: { productId: number; storeId?: number; movementType: StockMovementType; quantity: number; reason?: string }) =>
    unwrap<StockMovement>(api.post("/admin/inventory/adjust", payload)),
  transferStock: (payload: StockTransferPayload) => unwrap<StockTransfer>(api.post("/admin/inventory/transfers", payload)),
  getNotifications: () => unwrap<NotificationLog[]>(api.get("/admin/notifications")),
  markNotificationRead: (id: number) => unwrap<NotificationLog>(api.patch(`/admin/notifications/${id}/read`)),
  markAllNotificationsRead: () => unwrap(api.patch("/admin/notifications/read-all")),
  toggleUser: (id: number) => unwrap<UserSummary>(api.patch(`/admin/users/${id}/toggle`)),
  getCartItems: () => unwrap<AdminCartItem[]>(api.get("/admin/cart-items")),
  recoverCartItem: (id: number) => unwrap<CartRecoveryResult>(api.post(`/admin/cart-items/${id}/recover`)),
  deleteCartItem: (id: number) => unwrap(api.delete(`/admin/cart-items/${id}`)),
  getWishlistItems: () => unwrap<AdminWishlistItem[]>(api.get("/admin/wishlist-items")),
  deleteWishlistItem: (id: number) => unwrap(api.delete(`/admin/wishlist-items/${id}`)),
  getReviews: () => unwrap<ProductReview[]>(api.get("/admin/reviews")),
  getFailedPayments: () => unwrap<Order[]>(api.get("/admin/payments/failed")),
  recoverFailedPayment: (orderId: number) => unwrap<PaymentRecoveryResult>(api.post(`/admin/payments/failed/${orderId}/recover`)),
  createReview: (payload: ProductReviewPayload) => unwrap<ProductReview>(api.post("/admin/reviews", payload)),
  updateReview: (id: number, payload: ProductReviewPayload) => unwrap<ProductReview>(api.put(`/admin/reviews/${id}`, payload)),
  updateReviewStatus: (id: number, value: string) => unwrap<ProductReview>(api.patch(`/admin/reviews/${id}/status`, { value })),
  toggleReviewFeatured: (id: number) => unwrap<ProductReview>(api.patch(`/admin/reviews/${id}/featured`)),
  deleteReview: (id: number) => unwrap(api.delete(`/admin/reviews/${id}`)),
  getEnquiries: () => unwrap<Enquiry[]>(api.get("/admin/enquiries")),
  updateEnquiryStatus: (id: number, value: string) => unwrap<Enquiry>(api.patch(`/admin/enquiries/${id}/status`, { value })),
  createStore: (payload: unknown) => unwrap<Store>(api.post("/admin/stores", payload)),
  updateStore: (id: number, payload: unknown) => unwrap<Store>(api.put(`/admin/stores/${id}`, payload)),
  deleteStore: (id: number) => unwrap(api.delete(`/admin/stores/${id}`)),
  createBanner: (payload: unknown) => unwrap<Banner>(api.post("/admin/banners", payload)),
  updateBanner: (id: number, payload: unknown) => unwrap<Banner>(api.put(`/admin/banners/${id}`, payload)),
  deleteBanner: (id: number) => unwrap(api.delete(`/admin/banners/${id}`)),
  createCategory: (payload: unknown) => unwrap<Category>(api.post("/admin/categories", payload)),
  updateCategory: (id: number, payload: unknown) => unwrap<Category>(api.put(`/admin/categories/${id}`, payload)),
  deleteCategory: (id: number) => unwrap(api.delete(`/admin/categories/${id}`)),
  createBrand: (payload: unknown) => unwrap<Brand>(api.post("/admin/brands", payload)),
  updateBrand: (id: number, payload: unknown) => unwrap<Brand>(api.put(`/admin/brands/${id}`, payload)),
  deleteBrand: (id: number) => unwrap(api.delete(`/admin/brands/${id}`)),
  getCoupons: () => unwrap<Coupon[]>(api.get("/admin/coupons")),
  getCouponAnalytics: () => unwrap<CouponAnalytics[]>(api.get("/admin/coupons/analytics")),
  createCoupon: (payload: unknown) => unwrap<Coupon>(api.post("/admin/coupons", payload)),
  updateCoupon: (id: number, payload: unknown) => unwrap<Coupon>(api.put(`/admin/coupons/${id}`, payload)),
  deleteCoupon: (id: number) => unwrap(api.delete(`/admin/coupons/${id}`)),
  getSettings: () => unwrap<SiteSettings>(api.get("/admin/settings")),
  updateSettings: (payload: unknown) => unwrap<SiteSettings>(api.put("/admin/settings", payload)),
  getRazorpaySettings: () => unwrap<RazorpaySettings>(api.get("/admin/payments/razorpay")),
  getSystemHealth: () => unwrap<SystemHealth>(api.get("/admin/system/health")),
  uploadMedia: async (file: File, folder = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    return unwrap<{ url: string; publicId: string }>(api.post("/admin/media/upload", formData));
  },
  deleteMedia: (publicId: string) => unwrap(api.delete("/admin/media", { params: { publicId } }))
};

export const catalogApi = {
  getBrands: () => unwrap<Brand[]>(api.get("/brands")),
  getCategories: () => unwrap<Category[]>(api.get("/categories")),
  getStores: () => unwrap<Store[]>(api.get("/stores")),
  getBanners: () => unwrap<Banner[]>(api.get("/banners"))
};

export interface ListAdminsParams {
  search?: string;
  role?: Role;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const superAdminApi = {
  listAdmins: (params: ListAdminsParams = {}) =>
    unwrap<PageResponse<AdminUser>>(
      api.get("/super-admin/admins", {
        params: {
          search: params.search || undefined,
          role: params.role || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
          sortBy: params.sortBy || "createdAt",
          sortDir: params.sortDir || "desc"
        }
      })
    ),
  getAdmin: (id: number) => unwrap<AdminUser>(api.get(`/super-admin/admins/${id}`)),
  createAdmin: (payload: AdminCreatePayload) =>
    unwrap<AdminUser>(api.post("/super-admin/admins", payload)),
  updateAdmin: (id: number, payload: AdminUpdatePayload) =>
    unwrap<AdminUser>(api.put(`/super-admin/admins/${id}`, payload)),
  setStatus: (id: number, status: AdminStatus) =>
    unwrap<AdminUser>(api.patch(`/super-admin/admins/${id}/status`, { status })),
  resetPassword: (id: number, password: string) =>
    unwrap(api.patch(`/super-admin/admins/${id}/reset-password`, { password })),
  deleteAdmin: (id: number) => unwrap(api.delete(`/super-admin/admins/${id}`)),
  getAdminPermissions: (id: number) =>
    unwrap<AdminPermissions>(api.get(`/super-admin/admins/${id}/permissions`)),
  setAdminPermissions: (id: number, permissions: { module: string; action: string; granted: boolean }[]) =>
    unwrap<AdminPermissions>(api.put(`/super-admin/admins/${id}/permissions`, { permissions })),
  setAdminStores: (id: number, storeIds: number[]) =>
    unwrap<AdminUser>(api.put(`/super-admin/admins/${id}/stores`, { storeIds })),
  getAdminActivity: (id: number, page = 0, size = 20) =>
    unwrap<PageResponse<AdminActivityLogEntry>>(
      api.get(`/super-admin/admins/${id}/activity-logs`, { params: { page, size } })
    ),
  getLoginHistory: (page = 0, size = 20) =>
    unwrap<PageResponse<AdminLoginHistoryEntry>>(
      api.get("/super-admin/login-history", { params: { page, size } })
    ),
  listRoles: () => unwrap<RolePermissions[]>(api.get("/super-admin/roles")),
  createRole: (payload: { roleKey: string; displayName: string; description?: string; baseRole: Role }) =>
    unwrap<RolePermissions>(api.post("/super-admin/roles", payload)),
  updateRole: (roleKey: string, payload: { displayName?: string; description?: string; active?: boolean }) =>
    unwrap<RolePermissions>(api.put(`/super-admin/roles/${roleKey}`, payload)),
  deleteRole: (roleKey: string) => unwrap(api.delete(`/super-admin/roles/${roleKey}`)),
  getRolePermissions: (roleKey: string) =>
    unwrap<RolePermissions>(api.get(`/super-admin/roles/${roleKey}/permissions`)),
  setRolePermissions: (roleKey: string, permissions: RolePermissionEntry[]) =>
    unwrap<RolePermissions>(api.put(`/super-admin/roles/${roleKey}/permissions`, { permissions })),
  getPermissionCatalog: () => unwrap<PermissionCatalog>(api.get("/super-admin/permissions")),
  getStores: () => unwrap<Store[]>(api.get("/super-admin/stores"))
};
