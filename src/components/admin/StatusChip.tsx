import { StatusBadge } from "components/admin/StatusBadge";
import type { AdminStatus, Role } from "types";

const statusClass: Record<AdminStatus, string> = {
  ACTIVE: "admin-badge-green",
  DISABLED: "admin-badge-rose",
  SUSPENDED: "admin-badge-amber"
};

const statusLabel: Record<AdminStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  SUSPENDED: "Suspended"
};

export function StatusChip({ status }: { status: AdminStatus }) {
  const tone = status === "ACTIVE" ? "success" : status === "DISABLED" ? "danger" : "warning";
  return <StatusBadge tone={tone}>{statusLabel[status]}</StatusBadge>;
}

const roleLabel: Record<Role, string> = {
  USER: "Customer",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  STORE_MANAGER: "Store Manager",
  SALES_EXECUTIVE: "Sales Executive",
  SUPPORT_AGENT: "Support Agent",
  INVENTORY_MANAGER: "Inventory Manager",
  CONTENT_MANAGER: "Content Manager",
  ACCOUNTANT: "Accountant"
};

export function RoleChip({ role, label }: { role: Role; label?: string }) {
  const isSuper = role === "SUPER_ADMIN";
  return <StatusBadge tone={isSuper ? "violet" : "info"}>{label ?? roleLabel[role] ?? role}</StatusBadge>;
}

export function formatRole(role: Role): string {
  return roleLabel[role] ?? role;
}
