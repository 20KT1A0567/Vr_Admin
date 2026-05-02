import axios, { type InternalAxiosRequestConfig } from "axios";
import type {
  AdminActivityLogEntry,
  AdminCreatePayload,
  AdminLoginHistoryEntry,
  AdminPermissions,
  AdminStatus,
  AdminUpdatePayload,
  AdminUser,
  ApiEnvelope,
  AuthUser,
  AdminProductListFilters,
  Banner,
  Brand,
  Category,
  Coupon,
  DashboardStats,
  Enquiry,
  Order,
  PageResponse,
  PermissionCatalog,
  Product,
  ProductBulkActionPayload,
  Role,
  RolePermissionEntry,
  RolePermissions,
  SiteSettings,
  Store,
  UserSummary
} from "types";
import { useAuthStore } from "store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api"
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
  return ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((path) => url.includes(path));
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
  const token = readPersistedUser()?.token;
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
  login: (payload: { email: string; password: string }) => unwrap<AuthUser>(api.post("/auth/login", payload)),
  refresh: (refreshToken: string) => unwrap<AuthUser>(api.post("/auth/refresh", { refreshToken })),
  logout: (refreshToken: string) => unwrap(api.post("/auth/logout", { refreshToken })),
  me: () => unwrap<AuthUser>(api.get("/auth/me"))
};

export const adminApi = {
  getDashboard: () => unwrap<DashboardStats>(api.get("/admin/dashboard")),
  getBrands: () => unwrap<Brand[]>(api.get("/admin/brands")),
  getCategories: () => unwrap<Category[]>(api.get("/admin/categories")),
  getStores: () => unwrap<Store[]>(api.get("/admin/stores")),
  getBanners: () => unwrap<Banner[]>(api.get("/admin/banners")),
  getProducts: (params?: AdminProductListFilters) => unwrap<Product[]>(api.get("/admin/products", { params })),
  getProduct: (id: number) => unwrap<Product>(api.get(`/admin/products/${id}`)),
  createProduct: (payload: unknown) => unwrap<Product>(api.post("/admin/products", payload)),
  updateProduct: (id: number, payload: unknown) => unwrap<Product>(api.put(`/admin/products/${id}`, payload)),
  bulkProductAction: (payload: ProductBulkActionPayload) => unwrap(api.patch("/admin/products/bulk", payload)),
  duplicateProduct: (id: number) => unwrap<Product>(api.post(`/admin/products/${id}/duplicate`)),
  deleteProduct: (id: number) => unwrap(api.delete(`/admin/products/${id}`)),
  uploadProductImage: async (productId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap<Product>(api.post(`/admin/products/${productId}/images`, formData));
  },
  deleteProductImage: (productId: number, imageId: number) => unwrap<Product>(api.delete(`/admin/products/${productId}/images/${imageId}`)),
  getOrders: () => unwrap<Order[]>(api.get("/admin/orders")),
  getOrder: (id: number) => unwrap<Order>(api.get(`/admin/orders/${id}`)),
  updateOrderStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/status`, { value })),
  updatePaymentStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/payment-status`, { value })),
  downloadOrderInvoice: async (id: number) => {
    const response = await api.get(`/admin/orders/${id}/invoice`, { responseType: "blob" });
    return response.data as Blob;
  },
  getUsers: () => unwrap<UserSummary[]>(api.get("/admin/users")),
  toggleUser: (id: number) => unwrap<UserSummary>(api.patch(`/admin/users/${id}/toggle`)),
  getEnquiries: () => unwrap<Enquiry[]>(api.get("/admin/enquiries")),
  updateEnquiryStatus: (id: number, value: string) => unwrap<Enquiry>(api.patch(`/admin/enquiries/${id}/status`, { value })),
  createStore: (payload: unknown) => unwrap<Store>(api.post("/admin/stores", payload)),
  updateStore: (id: number, payload: unknown) => unwrap<Store>(api.put(`/admin/stores/${id}`, payload)),
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
  createCoupon: (payload: unknown) => unwrap<Coupon>(api.post("/admin/coupons", payload)),
  updateCoupon: (id: number, payload: unknown) => unwrap<Coupon>(api.put(`/admin/coupons/${id}`, payload)),
  deleteCoupon: (id: number) => unwrap(api.delete(`/admin/coupons/${id}`)),
  getSettings: () => unwrap<SiteSettings>(api.get("/admin/settings")),
  updateSettings: (payload: unknown) => unwrap<SiteSettings>(api.put("/admin/settings", payload)),
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
