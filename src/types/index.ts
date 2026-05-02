export type Role =
  | "USER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "MANAGER"
  | "STORE_MANAGER"
  | "SALES_EXECUTIVE"
  | "SUPPORT_AGENT"
  | "INVENTORY_MANAGER"
  | "CONTENT_MANAGER"
  | "ACCOUNTANT";

export type AdminStatus = "ACTIVE" | "DISABLED" | "SUSPENDED";

export type AdminModule =
  | "DASHBOARD"
  | "PRODUCTS"
  | "CATEGORIES"
  | "BRANDS"
  | "STORES"
  | "BANNERS"
  | "COUPONS"
  | "ORDERS"
  | "CUSTOMERS"
  | "INVENTORY"
  | "ENQUIRIES"
  | "SERVICES"
  | "SETTINGS"
  | "REPORTS"
  | "ADMINS"
  | "WEBSITE_CONTENT";

export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "EXPORT"
  | "ASSIGN";

export type ProductCondition = "EXCELLENT" | "GOOD" | "FAIR";
export type ProductBulkActionType =
  | "DELETE"
  | "SET_VISIBILITY"
  | "ASSIGN_CATEGORY"
  | "ADJUST_PRICE_PERCENT"
  | "SET_FEATURED"
  | "SET_TODAY_DEAL"
  | "SET_BEST_SELLER";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "READY" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentGateway = "OFFLINE" | "RAZORPAY";
export type PaymentTransactionStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED" | "CANCELLED";
export type BannerMediaType = "IMAGE" | "VIDEO";
export type BannerPlacement = "HOME_HERO" | "HOME_MIDDLE" | "CATEGORY" | "PRODUCT_DETAIL";
export type OrderTimelineEventType =
  | "PLACED"
  | "PAYMENT_PENDING"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "REFUNDED";
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
  roleKey?: string;
  roleName?: string;
  token: string;
  refreshToken?: string;
  sessionId?: number;
  tokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  visibleModules?: AdminModule[];
  permissions?: AuthPermission[];
}

export interface AuthPermission {
  module: AdminModule;
  action: PermissionAction;
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
  landmark?: string;
  postalCode?: string;
  city: string;
  state: string;
  phone: string;
  whatsapp?: string;
  timings?: string;
  mapLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
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
  brandLogoUrl?: string;
  categoryId?: number;
  categoryName?: string;
  categorySlug?: string;
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
  bestSeller: boolean;
  todayDeal: boolean;
  dealStartDate?: string;
  dealEndDate?: string;
  videoUrl?: string;
  lowStockThreshold?: number;
  description?: string;
  customAttributes?: Record<string, unknown>;
  stores: Store[];
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductListFilters {
  q?: string;
  brandIds?: number[];
  categoryIds?: number[];
  storeIds?: number[];
  stockStates?: Array<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">;
  available?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  todayDeal?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductBulkActionPayload {
  productIds: number[];
  action: ProductBulkActionType;
  visible?: boolean;
  enabled?: boolean;
  categoryId?: number;
  priceAdjustmentPercent?: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  invoiceNumber: string;
  totalAmount: number;
  status: OrderStatus;
  deliveryType: "PICKUP" | "DELIVERY";
  paymentMethod: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
  paymentStatus: PaymentStatus;
  store?: Store;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  deliveryAddress?: string;
  notes?: string;
  cancellationReason?: string;
  returnReason?: string;
  paidAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  returnRequestedAt?: string;
  latestPayment?: PaymentTransaction;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: number; quantity: number; priceAtTime: number; product: Product }>;
}

export interface PaymentTransaction {
  id: number;
  gateway: PaymentGateway;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  receipt?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewayStatus?: string;
  failureReason?: string;
  verifiedAt?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt?: string;
}

export interface OrderTimelineEvent {
  id: number;
  eventType: OrderTimelineEventType;
  title: string;
  description?: string;
  source?: string;
  actorId?: number;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
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
  desktopImageUrl?: string;
  mobileImageUrl?: string;
  videoUrl?: string;
  mediaType?: BannerMediaType;
  ctaText?: string;
  linkUrl?: string;
  placement?: BannerPlacement;
  active: boolean;
  activeNow?: boolean;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
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

export interface AdminUserStoreSummary {
  id: number;
  name: string;
  city: string;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  roleKey?: string;
  roleName?: string;
  status: AdminStatus;
  active: boolean;
  profileImageUrl?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  allowedLoginStartTime?: string;
  allowedLoginEndTime?: string;
  lastLoginAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  stores: AdminUserStoreSummary[];
}

export interface AdminPermissionEntry {
  module: AdminModule;
  action: PermissionAction;
  granted: boolean;
  fromOverride: boolean;
}

export interface AdminPermissions {
  adminId: number;
  entries: AdminPermissionEntry[];
  visibleModules: AdminModule[];
}

export interface RolePermissionEntry {
  module: AdminModule;
  action: PermissionAction;
  granted: boolean;
}

export interface ManagedRole {
  roleKey: string;
  displayName: string;
  description?: string;
  baseRole: Role;
  active: boolean;
  protectedRole: boolean;
  systemRole: boolean;
  adminCount: number;
}

export interface RolePermissions {
  role: Role;
  roleKey: string;
  displayName: string;
  description?: string;
  baseRole: Role;
  active: boolean;
  protectedRole: boolean;
  systemRole: boolean;
  adminCount: number;
  entries: RolePermissionEntry[];
}

export interface PermissionCatalog {
  modules: AdminModule[];
  actions: PermissionAction[];
  roles: Role[];
  managedRoles: ManagedRole[];
}

export interface AdminActivityLogEntry {
  id: number;
  adminId?: number;
  adminEmail?: string;
  module?: AdminModule;
  action?: PermissionAction;
  entityType?: string;
  entityId?: number;
  oldValue?: string;
  newValue?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminLoginHistoryEntry {
  id: number;
  adminId?: number;
  adminEmail?: string;
  sessionId?: number;
  loginAt?: string;
  logoutAt?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  failureReason?: string;
}

export interface PageResponse<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface AdminCreatePayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  roleKey?: string;
  profileImageUrl?: string;
  accessStartDate?: string | null;
  accessEndDate?: string | null;
  allowedLoginStartTime?: string | null;
  allowedLoginEndTime?: string | null;
  storeIds?: number[];
}

export interface AdminUpdatePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: Role;
  roleKey?: string;
  profileImageUrl?: string;
  accessStartDate?: string | null;
  accessEndDate?: string | null;
  allowedLoginStartTime?: string | null;
  allowedLoginEndTime?: string | null;
  storeIds?: number[];
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
