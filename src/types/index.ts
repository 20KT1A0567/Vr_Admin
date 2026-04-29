export type Role = "USER" | "ADMIN";
export type ProductCondition = "EXCELLENT" | "GOOD" | "FAIR";
export type OrderStatus = "PENDING" | "CONFIRMED" | "READY" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type CouponStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  token: string;
}

export interface Brand {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  whatsapp?: string;
  timings?: string;
  mapLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  active: boolean;
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  publicId?: string;
  primaryImage: boolean;
  sortOrder: number;
}

export interface Product {
  id: number;
  title: string;
  brandId?: number;
  brandName?: string;
  categoryId?: number;
  categoryName?: string;
  modelNumber?: string;
  processor?: string;
  processorGeneration?: string;
  ramGb?: number;
  storageGb?: number;
  storageType?: string;
  displaySize?: string;
  displayType?: string;
  os?: string;
  graphicsCard?: string;
  battery?: string;
  weight?: string;
  warrantyMonths?: number;
  warrantySummary?: string;
  returnDays?: number;
  sku?: string;
  serialNumber?: string;
  productCondition?: ProductCondition;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stockQuantity?: number;
  available: boolean;
  featured: boolean;
  description?: string;
  stores: Store[];
  images: ProductImage[];
}

export interface Order {
  id: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  store?: Store;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  items: Array<{ id: number; quantity: number; priceAtTime: number; product: Product }>;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  status: "NEW" | "FOLLOW_UP" | "RESOLVED";
}

export interface Banner {
  id: number;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  videoUrl?: string;
  linkUrl?: string;
  active: boolean;
  sortOrder: number;
}

export interface Coupon {
  id: number;
  code: string;
  discount: number;
  minOrder: number;
  expiryDate?: string;
  usageLimit: number;
  status: CouponStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSettings {
  id: number;
  companyName: string;
  supportEmail?: string;
  supportPhone?: string;
  shippingNote?: string;
  returnPolicy?: string;
  defaultCity?: string;
  defaultState?: string;
  mapLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardOrderStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardStoreSales {
  storeId: number;
  storeName: string;
  ordersCount: number;
  revenue: number;
  productsCount: number;
  active: boolean;
}

export interface DashboardTopProduct {
  productId: number;
  title: string;
  soldQuantity: number;
  revenue: number;
  stockQuantity?: number;
  storeNames: string[];
}

export interface DashboardLowStock {
  productId: number;
  title: string;
  stockQuantity?: number;
  available: boolean;
  storeNames: string[];
}

export interface DashboardRecentOrder {
  orderId: number;
  customerName: string;
  contactPhone: string;
  storeName: string;
  amount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalStores: number;
  activeStores: number;
  totalRevenue: number;
  newEnquiries: number;
  pendingOrders: number;
  lowStockProducts: number;
  orderStatuses: DashboardOrderStatus[];
  storeSales: DashboardStoreSales[];
  topProducts: DashboardTopProduct[];
  lowStockItems: DashboardLowStock[];
  recentOrders: DashboardRecentOrder[];
}
