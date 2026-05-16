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
  | "REVIEWS"
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
export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
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
export type BannerPlacement = "HOME_HERO" | "HOME_MIDDLE" | "CATEGORY" | "PRODUCT_DETAIL" | "USE_CASE";
export type ProductSectionType =
  | "BEST_SELLERS"
  | "TODAYS_DEALS"
  | "FEATURED_PRODUCTS"
  | "NEW_ARRIVALS"
  | "TRENDING_PRODUCTS"
  | "RECOMMENDED_PRODUCTS"
  | "TOP_RATED"
  | "LOW_PRICE_DEALS";
export type ProductSectionSelectionMode = "MANUAL" | "AUTOMATIC" | "HYBRID";
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
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
  id: number;
  name: string;
  email?: string;
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
  description?: string;
  sortOrder?: number;
  discountPercent?: number;
  active?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  iconUrl?: string;
  compareFields?: string;
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
  imageUrl?: string;
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
  productStatus?: ProductStatus;
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
  displayOrder?: number;
  videoUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  hsnCode?: string;
  gstRatePercent?: number;
  taxable?: boolean;
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

export interface ProductReview {
  id: number;
  productId?: number;
  productTitle?: string;
  productImageUrl?: string;
  userId?: number;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  comment: string;
  status: ReviewStatus;
  featured: boolean;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewPayload {
  productId?: number | null;
  userId?: number | null;
  customerName: string;
  customerEmail?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  status: ReviewStatus;
  featured: boolean;
  adminNote?: string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  invoiceNumber: string;
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  deliveryCharge?: number;
  couponCode?: string;
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
  deliveryState?: string;
  notes?: string;
  cancellationReason?: string;
  returnReason?: string;
  paidAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  returnRequestedAt?: string;
  shippedAt?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  latestPayment?: PaymentTransaction;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: number; quantity: number; priceAtTime: number; product: Product }>;
}

export interface ShipmentUpdatePayload {
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  markShipped?: boolean;
  clear?: boolean;
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
  email?: string;
  phone?: string;
  role: Role;
  active: boolean;
  createdAt: string;
  preferredContactName?: string;
  preferredContactPhone?: string;
  preferredContactEmail?: string;
  defaultDeliveryAddress?: string;
  ordersCount?: number;
  deliveredOrdersCount?: number;
  pendingOrdersCount?: number;
  totalSpent?: number;
  lastOrderAt?: string;
  lastOrderStatus?: string;
  lastPaymentStatus?: string;
  cartItemCount?: number;
  cartQuantity?: number;
  wishlistCount?: number;
}

export interface AdminCartItem {
  id: number;
  quantity: number;
  estimatedValue?: number;
  recoverable?: boolean;
  user: UserSummary;
  product: Product;
}

export interface CartRecoveryResult {
  cartItemId: number;
  userId: number;
  customerName?: string;
  emailStatus?: string;
  whatsappStatus?: string;
  message?: string;
}

export interface PaymentRecoveryResult {
  orderId: number;
  orderNumber?: string;
  emailStatus?: string;
  whatsappStatus?: string;
  message?: string;
}

export interface AdminWishlistItem {
  id: number;
  addedAt?: string;
  user: UserSummary;
  product: Product;
}

export interface Enquiry {
  id: number;
  name: string;
  phone: string;
  email?: string;
  enquiryType?: string;
  companyName?: string;
  quantity?: number;
  budget?: number;
  message?: string;
  status: "NEW" | "FOLLOW_UP" | "RESOLVED";
  createdAt?: string;
  updatedAt?: string;
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
  usageCount?: number;
  totalDiscountGiven?: number;
  totalRevenueGenerated?: number;
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
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  standardDeliveryCharge?: number;
  freeDeliveryThreshold?: number;
  stateDeliveryCharges?: string;
  stateDeliveryWindows?: string;
  estimatedDeliveryDays?: number;
  gstEnabled?: boolean;
  gstRate?: number;
  gstNumber?: string;
  companyPan?: string;
  defaultHsnCode?: string;
  companyAddress?: string;
  companyPincode?: string;
  invoicePrefix?: string;
  invoicePadding?: number;
  invoiceNextSequence?: number;
  invoiceTerms?: string;
  returnPolicy?: string;
  defaultCity?: string;
  defaultState?: string;
  mapLink?: string;
  includeDefaultHomeSections?: boolean;
  defaultHomeSectionTypes?: string;
  notificationEmailFrom?: string;
  notificationReplyTo?: string;
  whatsappNumber?: string;
  orderNotificationsEnabled?: boolean;
  paymentNotificationsEnabled?: boolean;
  returnNotificationsEnabled?: boolean;
  securityNotice?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReturnRequestStatus = "REQUESTED" | "APPROVED" | "PICKUP_SCHEDULED" | "PICKED_UP" | "INSPECTED" | "REJECTED" | "REFUND_PENDING" | "REFUNDED" | "CLOSED";
export type StockMovementType =
  | "RESTOCK"
  | "ADJUSTMENT"
  | "SALE_RESERVATION"
  | "ORDER_CANCEL_RELEASE"
  | "RETURN_RELEASE"
  | "TRANSFER_OUT"
  | "TRANSFER_IN";

export interface ReturnRequest {
  id: number;
  orderId: number;
  orderNumber?: string;
  userId: number;
  customerName?: string;
  reason: string;
  status: ReturnRequestStatus;
  adminNote?: string;
  resolvedAt?: string;
  resolvedBy?: number;
  pickupScheduledAt?: string;
  pickedUpAt?: string;
  inspectedAt?: string;
  pickupAgent?: string;
  pickupTrackingNumber?: string;
  inspectionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentWebhookEvent {
  id: number;
  gatewayEventId?: string;
  gateway: string;
  eventType?: string;
  status?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
}

export interface RefundTransaction {
  id: number;
  orderId: number;
  paymentTransactionId?: number;
  refundId?: string;
  amount: number;
  status: string;
  reason?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface CouponAnalytics {
  couponId: number;
  code: string;
  usageCount: number;
  orderCount: number;
  discountGiven: number;
  revenueAfterDiscount: number;
}

export interface AdminActivitySummary {
  todayChanges: number;
  failedLoginsToday: number;
  suspiciousActionsToday: number;
  openReturns: number;
  failedPayments: number;
}

export interface StockMovement {
  id: number;
  productId: number;
  productTitle: string;
  storeId?: number;
  storeName?: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface StockTransfer {
  id: number;
  productId: number;
  productTitle: string;
  fromStoreId: number;
  fromStoreName: string;
  toStoreId: number;
  toStoreName: string;
  quantity: number;
  reason?: string;
  initiatedById?: number;
  initiatedByEmail?: string;
  outMovementId?: number;
  inMovementId?: number;
  createdAt: string;
}

export interface StockTransferPayload {
  productId: number;
  fromStoreId: number;
  toStoreId: number;
  quantity: number;
  reason?: string;
}

export interface NotificationLog {
  id: number;
  eventType: string;
  channel: string;
  recipient?: string;
  subject?: string;
  message?: string;
  status: string;
  read: boolean;
  orderId?: number;
  createdAt: string;
}

export interface BackInStockRequest {
  id: number;
  productId: number;
  productTitle: string;
  email: string;
  phone?: string;
  status: "WAITING" | "READY_TO_NOTIFY" | "NOTIFIED" | string;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemHealthComponent {
  key: string;
  label: string;
  status: "OK" | "WARN" | "ERROR" | string;
  message: string;
}

export interface SystemHealth {
  status: "OK" | "DEGRADED" | string;
  checkedAt: string;
  components: SystemHealthComponent[];
}

export interface ProductImportResponse {
  created: number;
  updated: number;
  skipped: number;
  messages: string[];
}

export interface ProductSectionItem {
  id: number;
  displayOrder?: number;
  product: Product;
}

export interface ProductSection {
  id: number;
  title: string;
  subtitle?: string;
  sectionType: ProductSectionType;
  selectionMode: ProductSectionSelectionMode;
  displayOrder: number;
  active: boolean;
  startAt?: string;
  endAt?: string;
  maxProducts: number;
  products: ProductSectionItem[];
  resolvedProducts: Product[];
}

export interface RazorpaySettings {
  enabled: boolean;
  configured: boolean;
  keyId?: string;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  currency: string;
  merchantName: string;
  apiBaseUrl: string;
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

export interface AdminStoreTopProduct {
  productId: number;
  title: string;
  soldQuantity: number;
  revenue: number;
  stockQuantity?: number;
  available: boolean;
}

export interface AdminStorePerformance {
  storeId: number;
  storeName: string;
  city: string;
  active: boolean;
  productsCount: number;
  activeProductsCount: number;
  lowStockProductsCount: number;
  ordersCount: number;
  pendingOrdersCount: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  unitsSold: number;
  revenue: number;
  pipelineRevenue: number;
  averageOrderValue: number;
  revenueContributionPercent?: number;
  revenuePerActiveProduct?: number;
  unitsPerOrder?: number;
  deliveredRate?: number;
  cancellationRate?: number;
  topProductRevenueShare?: number;
  lastOrderAt?: string;
  topProducts: AdminStoreTopProduct[];
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
  allowedLoginDays?: DayOfWeek[];
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  stores: AdminUserStoreSummary[];
}

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export const DAYS_OF_WEEK: { key: DayOfWeek; short: string; long: string }[] = [
  { key: "MONDAY", short: "Mon", long: "Monday" },
  { key: "TUESDAY", short: "Tue", long: "Tuesday" },
  { key: "WEDNESDAY", short: "Wed", long: "Wednesday" },
  { key: "THURSDAY", short: "Thu", long: "Thursday" },
  { key: "FRIDAY", short: "Fri", long: "Friday" },
  { key: "SATURDAY", short: "Sat", long: "Saturday" },
  { key: "SUNDAY", short: "Sun", long: "Sunday" }
];

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
  allowedLoginDays?: DayOfWeek[];
  twoFactorEnabled?: boolean;
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
  allowedLoginDays?: DayOfWeek[];
  twoFactorEnabled?: boolean;
  storeIds?: number[];
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  message?: string;
}

export interface AdminSession {
  id: number;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt?: string;
  createdAt?: string;
  refreshTokenExpiresAt?: string;
  current: boolean;
}

export interface BackupCodeStatus {
  active: number;
  total: number;
  exists: boolean;
  generatedCodes?: string[];
}

export interface Customer360Profile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  profileImageUrl?: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

export interface Customer360Summary {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  openEnquiries: number;
  openReturns: number;
  cartItemCount: number;
  wishlistItemCount: number;
  backInStockSubscriptions: number;
}

export interface Customer360OrderItem {
  id: number;
  orderNumber?: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  storeName?: string;
  placedAt?: string;
  paidAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface Customer360CartLine {
  id: number;
  productId?: number;
  productTitle?: string;
  productImageUrl?: string;
  price: number;
  quantity: number;
  lineTotal: number;
  addedAt?: string;
}

export interface Customer360WishlistLine {
  id: number;
  productId?: number;
  productTitle?: string;
  productImageUrl?: string;
  price?: number;
  inStock: boolean;
  addedAt?: string;
}

export interface Customer360EnquiryLine {
  id: number;
  enquiryType?: string;
  status?: string;
  message?: string;
  productId?: number;
  productTitle?: string;
  createdAt?: string;
}

export interface Customer360ReturnLine {
  id: number;
  orderId?: number;
  orderNumber?: string;
  status: string;
  reason?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface Customer360BackInStockLine {
  id: number;
  productId?: number;
  productTitle?: string;
  status?: string;
  createdAt?: string;
}

export interface Customer360AddressLine {
  id: number;
  label?: string;
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  defaultAddress: boolean;
}

export interface Customer360 {
  profile: Customer360Profile;
  summary: Customer360Summary;
  recentOrders: Customer360OrderItem[];
  cart: Customer360CartLine[];
  wishlist: Customer360WishlistLine[];
  enquiries: Customer360EnquiryLine[];
  returns: Customer360ReturnLine[];
  backInStock: Customer360BackInStockLine[];
  addresses: Customer360AddressLine[];
}

export interface ProductAuditEntry {
  id: number;
  adminId?: number;
  adminEmail?: string;
  module?: string;
  action?: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "ASSIGN" | "EXPORT" | string;
  entityType?: string;
  entityId?: number;
  oldValue?: string;
  newValue?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

export type LoginResult = AuthUser | TwoFactorChallenge;

export function isTwoFactorChallenge(value: LoginResult): value is TwoFactorChallenge {
  return (value as TwoFactorChallenge).twoFactorRequired === true;
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
