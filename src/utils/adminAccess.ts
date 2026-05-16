import type { AdminModule, AuthUser } from "types";

export const allAdminModules: AdminModule[] = [
  "DASHBOARD",
  "PRODUCTS",
  "CATEGORIES",
  "BRANDS",
  "STORES",
  "BANNERS",
  "COUPONS",
  "REVIEWS",
  "ORDERS",
  "CUSTOMERS",
  "INVENTORY",
  "ENQUIRIES",
  "SERVICES",
  "SETTINGS",
  "REPORTS",
  "ADMINS",
  "WEBSITE_CONTENT"
];

const moduleRouteMap: Record<AdminModule, string> = {
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  CATEGORIES: "/categories",
  BRANDS: "/brands",
  STORES: "/stores",
  BANNERS: "/banners",
  COUPONS: "/coupons",
  REVIEWS: "/reviews",
  ORDERS: "/orders",
  CUSTOMERS: "/customers",
  INVENTORY: "/inventory",
  ENQUIRIES: "/enquiries",
  SERVICES: "/forbidden",
  SETTINGS: "/settings",
  REPORTS: "/reports",
  ADMINS: "/admin-users",
  WEBSITE_CONTENT: "/content"
};

export function getVisibleModules(user: AuthUser | null | undefined): AdminModule[] {
  if (!user) {
    return [];
  }
  if (user.visibleModules?.length) {
    return user.visibleModules;
  }
  return user.role === "USER" ? [] : allAdminModules;
}

export function canViewModule(user: AuthUser | null | undefined, module: AdminModule): boolean {
  return getVisibleModules(user).includes(module);
}

export function getDefaultAdminRoute(user: AuthUser | null | undefined): string {
  const visibleModules = getVisibleModules(user);
  const preferredOrder: AdminModule[] = [
    "DASHBOARD",
    "ORDERS",
    "PRODUCTS",
    "ENQUIRIES",
    "CUSTOMERS",
    "INVENTORY",
    "STORES",
    "BANNERS",
    "COUPONS",
    "REVIEWS",
    "ADMINS",
    "SETTINGS"
  ];

  const firstAllowedModule = preferredOrder.find((module) => visibleModules.includes(module));
  return firstAllowedModule ? moduleRouteMap[firstAllowedModule] : "/forbidden";
}
