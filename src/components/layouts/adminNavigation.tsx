import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BadgePercent,
  BellDot,
  Boxes,
  Building2,
  ClipboardList,
  FileSearch,
  FileText,
  FolderKanban,
  Image,
  KeyRound,
  LayoutDashboard,
  Link2,
  PackageSearch,
  PanelsTopLeft,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  CreditCard,
  Store,
  Tags,
  UserCog,
  Users,
  Heart
} from "lucide-react";
import type { AdminModule } from "types";

export interface AdminNavItem {
  description: string;
  icon: LucideIcon;
  label: string;
  module?: AdminModule;
  to: string;
}

export interface AdminNavGroup {
  items: AdminNavItem[];
  title: string;
}

export interface AdminPageMeta {
  description: string;
  eyebrow: string;
  title: string;
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        icon: LayoutDashboard,
        description: "Operations dashboard",
        module: "DASHBOARD"
      }
    ]
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", to: "/products", icon: PackageSearch, description: "Listings and pricing", module: "PRODUCTS" },
      { label: "Categories", to: "/categories", icon: FolderKanban, description: "Category structure", module: "CATEGORIES" },
      { label: "Brands", to: "/brands", icon: Tags, description: "Brand library", module: "BRANDS" },
      { label: "Store Management", to: "/reports", icon: Boxes, description: "Income, orders, and product sales", module: "REPORTS" }
    ]
  },
  {
    title: "Storefront",
    items: [
      { label: "Stores", to: "/stores", icon: Store, description: "Branch directory", module: "STORES" },
      { label: "Banners", to: "/banners", icon: Image, description: "Campaign manager", module: "BANNERS" },
      { label: "Content", to: "/content", icon: Building2, description: "Homepage sections", module: "WEBSITE_CONTENT" },
      { label: "Media Library", to: "/media-library", icon: Image, description: "Reusable asset desk", module: "WEBSITE_CONTENT" },
      { label: "CMS Pages", to: "/cms-pages", icon: FileText, description: "Policy and info pages", module: "WEBSITE_CONTENT" },
      { label: "Navigation", to: "/navigation-manager", icon: Link2, description: "Header and footer menus", module: "WEBSITE_CONTENT" },
      { label: "Homepage Builder", to: "/homepage-builder", icon: PanelsTopLeft, description: "Homepage block order", module: "WEBSITE_CONTENT" },
      { label: "Brand Settings", to: "/brand-settings", icon: Sparkles, description: "Logo, contacts, and socials", module: "SETTINGS" },
      { label: "SEO Manager", to: "/seo-manager", icon: FileSearch, description: "Meta tags and sitemap controls", module: "SETTINGS" }
    ]
  },
  {
    title: "Commerce",
    items: [
      { label: "Orders", to: "/orders", icon: ShoppingBag, description: "Order desk", module: "ORDERS" },
      { label: "Payment Recovery", to: "/payment-recovery", icon: CreditCard, description: "Failed payment follow-up", module: "ORDERS" },
      { label: "Payment Webhooks", to: "/payment-webhooks", icon: CreditCard, description: "Gateway event history", module: "ORDERS" },
      { label: "Customers", to: "/customers", icon: Users, description: "Customer directory", module: "CUSTOMERS" },
      { label: "Cart Management", to: "/cart-management", icon: ShoppingCart, description: "Live cart records", module: "CUSTOMERS" },
      { label: "Wishlist Management", to: "/wishlist-management", icon: Heart, description: "Saved product records", module: "CUSTOMERS" },
      { label: "Coupons", to: "/coupons", icon: BadgePercent, description: "Coupon campaigns", module: "COUPONS" },
      { label: "Reviews", to: "/reviews", icon: BellDot, description: "Moderation desk", module: "REVIEWS" },
      { label: "Enquiries", to: "/enquiries", icon: BellDot, description: "CRM inbox", module: "ENQUIRIES" }
    ]
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", to: "/inventory", icon: Boxes, description: "Stock dashboard", module: "INVENTORY" },
      { label: "Stock Transfers", to: "/inventory/transfers", icon: ArrowRightLeft, description: "Branch stock moves", module: "INVENTORY" },
      { label: "Back In Stock", to: "/inventory/back-in-stock", icon: BellDot, description: "Customer restock requests", module: "INVENTORY" },
      { label: "Stock Movements", to: "/inventory/movements", icon: ClipboardList, description: "Inventory audit trail", module: "INVENTORY" }
    ]
  },
  {
    title: "Access Control",
    items: [
      { label: "Users", to: "/admin-users", icon: UserCog, description: "Admin roster", module: "ADMINS" },
      { label: "Roles & Permissions", to: "/roles-permissions", icon: KeyRound, description: "Permission matrix", module: "ADMINS" },
      { label: "Login History", to: "/login-history", icon: ClipboardList, description: "Session audit", module: "ADMINS" },
      { label: "Security", to: "/security", icon: ShieldCheck, description: "Sessions & backup codes" }
    ]
  },
  {
    title: "System",
    items: [
      { label: "Users & Roles", to: "/roles", icon: ShieldCheck, description: "Customer access", module: "CUSTOMERS" },
      { label: "Notifications", to: "/notifications", icon: BellDot, description: "System event inbox", module: "SETTINGS" },
      { label: "Notification Templates", to: "/notification-templates", icon: BellDot, description: "Channel message editor", module: "SETTINGS" },
      { label: "System Health", to: "/system-health", icon: Settings2, description: "API and integration status", module: "SETTINGS" },
      { label: "Settings", to: "/settings", icon: Settings2, description: "Business configuration", module: "SETTINGS" }
    ]
  }
];

export const adminPageMeta: Record<string, AdminPageMeta> = {
  dashboard: {
    eyebrow: "Overview",
    title: "Operations dashboard",
    description: "Track revenue, stock, order flow, and storefront activity from one premium control room."
  },
  products: {
    eyebrow: "Catalog",
    title: "Product management",
    description: "Search, filter, merchandize, and update the live catalog without touching backend flows."
  },
  categories: {
    eyebrow: "Catalog",
    title: "Categories",
    description: "Manage your product categories, navigation, and category-driven product fields."
  },
  brands: {
    eyebrow: "Catalog",
    title: "Brands",
    description: "Manage manufacturer records, logos, and brand visibility used across the storefront."
  },
  inventory: {
    eyebrow: "Catalog",
    title: "Stock Management",
    description: "Monitor stock health, mapped stores, and visibility signals across the full assortment."
  },
  movements: {
    eyebrow: "Inventory",
    title: "Stock movements",
    description: "Review inventory changes across restocks, adjustments, orders, and returns."
  },
  transfers: {
    eyebrow: "Inventory",
    title: "Stock transfers",
    description: "Move stock between branches and review the transfer audit trail."
  },
  stores: {
    eyebrow: "Storefront",
    title: "Store Management",
    description: "Manage branch identity, contact details, hours, ratings, and website visibility."
  },
  banners: {
    eyebrow: "Storefront",
    title: "Campaign banners",
    description: "Coordinate desktop and mobile creatives, CTA links, and publish windows."
  },
  content: {
    eyebrow: "Storefront",
    title: "Content hub",
    description: "Organize content operations for homepage sections, brand assets, categories, and banners."
  },
  "media-library": {
    eyebrow: "Storefront",
    title: "Media Library",
    description: "Upload, organize, search, and reuse storefront media with folder structure and accessible metadata."
  },
  "cms-pages": {
    eyebrow: "Storefront",
    title: "CMS Pages",
    description: "Edit policy pages, about copy, FAQ content, and other website text that should no longer live in code."
  },
  "navigation-manager": {
    eyebrow: "Storefront",
    title: "Navigation Manager",
    description: "Manage header, footer, and mobile navigation links with visibility and sort order controls."
  },
  "homepage-builder": {
    eyebrow: "Storefront",
    title: "Homepage Builder",
    description: "Control homepage announcements, banner placement, featured categories, trust blocks, and section order."
  },
  "brand-settings": {
    eyebrow: "Storefront",
    title: "Brand Settings",
    description: "Manage public logo, favicon, company copy, support contacts, address, and social links."
  },
  "seo-manager": {
    eyebrow: "Storefront",
    title: "SEO Manager",
    description: "Control page titles, descriptions, keywords, social previews, canonical links, no-index, and sitemap inclusion."
  },
  orders: {
    eyebrow: "Commerce",
    title: "Order desk",
    description: "Search, triage, and update live orders with clean operations-focused workflows."
  },
  "payment-recovery": {
    eyebrow: "Commerce",
    title: "Payment recovery",
    description: "Recover failed online payments with customer follow-up queues."
  },
  "payment-webhooks": {
    eyebrow: "Commerce",
    title: "Payment webhook events",
    description: "Review Razorpay webhook history, duplicate protection, and unmatched payment events."
  },
  customers: {
    eyebrow: "Commerce",
    title: "Customers",
    description: "Review customer profiles, account status, and engagement from one directory."
  },
  "cart-management": {
    eyebrow: "Commerce",
    title: "Cart management",
    description: "Inspect live customer carts, product demand, and stale cart rows."
  },
  "wishlist-management": {
    eyebrow: "Commerce",
    title: "Wishlist management",
    description: "Inspect saved products, customer interest, and wishlist cleanup."
  },
  coupons: {
    eyebrow: "Commerce",
    title: "Coupons",
    description: "Launch discount campaigns with cleaner controls around status, spend thresholds, and expiry."
  },
  enquiries: {
    eyebrow: "Commerce",
    title: "Enquiries",
    description: "Treat inbound leads like an inbox with status, contact context, and follow-up workflow."
  },
  reviews: {
    eyebrow: "Commerce",
    title: "Reviews",
    description: "Moderate product reviews, feature testimonials, and keep customer feedback storefront-ready."
  },
  "admin-users": {
    eyebrow: "Access Control",
    title: "Admin users",
    description: "Manage admin accounts, store assignment, scoped roles, and access windows."
  },
  "roles-permissions": {
    eyebrow: "Access Control",
    title: "Roles & permissions",
    description: "Define reusable admin roles and fine-tune module level permissions safely."
  },
  "login-history": {
    eyebrow: "Access Control",
    title: "Login history",
    description: "Audit sign-ins, suspicious attempts, and logout traces across admin sessions."
  },
  security: {
    eyebrow: "Access Control",
    title: "Account security",
    description: "Manage active sessions, devices signed in, and one-time backup codes for 2FA recovery."
  },
  roles: {
    eyebrow: "System",
    title: "Users & roles",
    description: "Review customer accounts, role labels, and current activation state."
  },
  settings: {
    eyebrow: "System",
    title: "Settings",
    description: "Configure business profile, storefront defaults, support details, and operations policies."
  },
  notifications: {
    eyebrow: "System",
    title: "Notifications",
    description: "Review operational notification events and mark them as read."
  },
  "notification-templates": {
    eyebrow: "System",
    title: "Notification Templates",
    description: "Manage customer-facing message copy for email, SMS, WhatsApp, and push channels."
  },
  "system-health": {
    eyebrow: "System",
    title: "System Health",
    description: "Monitor database, Cloudinary, Razorpay, and backend readiness."
  },
  reports: {
    eyebrow: "Catalog",
    title: "Store Wise Income",
    description: "Track branch-wise income, orders, product sales, delivery quality, and stock pressure."
  }
};

export function findActiveNavItem(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return adminNavGroups.flatMap((group) => group.items).find((item) => item.to === `/${firstSegment}`);
}

export function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return [{ label: "Dashboard", path: "/dashboard" }];
  }

  const crumbs = segments.map((segment, index) => ({
    label:
      segment === "dashboard"
        ? "Dashboard"
        : adminPageMeta[segment]?.title ?? segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    path: `/${segments.slice(0, index + 1).join("/")}`
  }));

  if (segments[0] === "dashboard") {
    return crumbs;
  }

  return [{ label: "Dashboard", path: "/dashboard" }, ...crumbs];
}

export function getPageMeta(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return adminPageMeta[firstSegment] ?? adminPageMeta.dashboard;
}

export const adminSidebarSummary = {
  title: "VR Technologies",
  /** Short line under the logo (expanded sidebar); displayed uppercase in UI. */
  tagline: "Enterprise commerce suite",
  /** Longer positioning line — optional in UI. */
  description: "A client-ready admin experience for catalog, storefronts, orders, and teams — polished for demos and daily operations."
};
