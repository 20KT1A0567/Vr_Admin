import axios from "axios";
import type {
  ApiEnvelope,
  AuthUser,
  Banner,
  Brand,
  Category,
  Coupon,
  DashboardStats,
  Enquiry,
  Order,
  Product,
  SiteSettings,
  Store,
  UserSummary
} from "types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api"
});

api.interceptors.request.use((config) => {
  const raw = window.localStorage.getItem("vrtech-admin-auth");
  if (raw) {
    const state = JSON.parse(raw) as { state?: { user?: AuthUser | null } };
    const token = state.state?.user?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const unwrap = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>) => (await promise).data.data;

export const authApi = {
  login: (payload: { email: string; password: string }) => unwrap<AuthUser>(api.post("/auth/login", payload))
};

export const adminApi = {
  getDashboard: () => unwrap<DashboardStats>(api.get("/admin/dashboard")),
  getBrands: () => unwrap<Brand[]>(api.get("/admin/brands")),
  getCategories: () => unwrap<Category[]>(api.get("/admin/categories")),
  getStores: () => unwrap<Store[]>(api.get("/admin/stores")),
  getBanners: () => unwrap<Banner[]>(api.get("/admin/banners")),
  getProducts: () => unwrap<Product[]>(api.get("/admin/products")),
  createProduct: (payload: unknown) => unwrap<Product>(api.post("/admin/products", payload)),
  updateProduct: (id: number, payload: unknown) => unwrap<Product>(api.put(`/admin/products/${id}`, payload)),
  deleteProduct: (id: number) => unwrap(api.delete(`/admin/products/${id}`)),
  uploadProductImage: async (productId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap<Product>(api.post(`/admin/products/${productId}/images`, formData));
  },
  deleteProductImage: (productId: number, imageId: number) => unwrap<Product>(api.delete(`/admin/products/${productId}/images/${imageId}`)),
  getOrders: () => unwrap<Order[]>(api.get("/admin/orders")),
  updateOrderStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/status`, { value })),
  updatePaymentStatus: (id: number, value: string) => unwrap<Order>(api.patch(`/admin/orders/${id}/payment-status`, { value })),
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
