import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BellDot,
  Boxes,
  Building2,
  ClipboardList,
  FolderKanban,
  Image,
  KeyRound,
  LayoutDashboard,
  PackageSearch,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  UserCog,
  Users,
  Warehouse
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
      { label: "Inventory", to: "/inventory", icon: Warehouse, description: "Stock control", module: "INVENTORY" }
    ]
  },
  {
    title: "Storefront",
    items: [
      { label: "Stores", to: "/stores", icon: Store, description: "Branch directory", module: "STORES" },
      { label: "Banners", to: "/banners", icon: Image, description: "Campaign manager", module: "BANNERS" },
      { label: "Content", to: "/content", icon: Building2, description: "CMS hub", module: "WEBSITE_CONTENT" }
    ]
  },
  {
    title: "Commerce",
    items: [
      { label: "Orders", to: "/orders", icon: ShoppingBag, description: "Order desk", module: "ORDERS" },
      { label: "Customers", to: "/customers", icon: Users, description: "Customer directory", module: "CUSTOMERS" },
      { label: "Coupons", to: "/coupons", icon: BadgePercent, description: "Coupon campaigns", module: "COUPONS" },
      { label: "Enquiries", to: "/enquiries", icon: BellDot, description: "CRM inbox", module: "ENQUIRIES" }
    ]
  },
  {
    title: "Access Control",
    items: [
      { label: "Admin Users", to: "/admin-users", icon: UserCog, description: "Admin roster", module: "ADMINS" },
      { label: "Roles & Permissions", to: "/roles-permissions", icon: KeyRound, description: "Permission matrix", module: "ADMINS" },
      { label: "Login History", to: "/login-history", icon: ClipboardList, description: "Session audit", module: "ADMINS" }
    ]
  },
  {
    title: "System",
    items: [
      { label: "Users & Roles", to: "/roles", icon: ShieldCheck, description: "Customer access", module: "CUSTOMERS" },
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
    description: "Keep category structure, visual identity, and storefront organization clean and consistent."
  },
  brands: {
    eyebrow: "Catalog",
    title: "Brands",
    description: "Manage manufacturer records, logos, and brand visibility used across the storefront."
  },
  inventory: {
    eyebrow: "Catalog",
    title: "Inventory control",
    description: "Monitor stock health, mapped stores, and visibility signals across the full assortment."
  },
  stores: {
    eyebrow: "Storefront",
    title: "Store directory",
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
  orders: {
    eyebrow: "Commerce",
    title: "Order desk",
    description: "Search, triage, and update live orders with clean operations-focused workflows."
  },
  customers: {
    eyebrow: "Commerce",
    title: "Customers",
    description: "Review customer profiles, account status, and engagement from one directory."
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
  roles: {
    eyebrow: "System",
    title: "Users & roles",
    description: "Review customer accounts, role labels, and current activation state."
  },
  settings: {
    eyebrow: "System",
    title: "Settings",
    description: "Configure business profile, storefront defaults, support details, and operations policies."
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

  return segments.map((segment, index) => ({
    label: adminPageMeta[segment]?.title ?? segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    path: `/${segments.slice(0, index + 1).join("/")}`
  }));
}

export function getPageMeta(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return adminPageMeta[firstSegment] ?? adminPageMeta.dashboard;
}

export const adminSidebarSummary = {
  title: "VR Technologies",
  description: "Premium operations dashboard for catalog, storefront, commerce, and access control."
};
