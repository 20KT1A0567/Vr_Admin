import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Heart, IndianRupee, Phone, Search, ShieldCheck, ShoppingCart, UserCog, Users as UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import type { UserSummary } from "types";

type UsersPageMode = "customers" | "roles";
type AccountFilter = "ALL" | "WEBSITE" | "ADMIN" | "SUPER_ADMIN";

interface UsersPageProps {
  mode?: UsersPageMode;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No orders yet";
  }
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value?: number) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatLabel(value?: string) {
  return value ? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : "None";
}

function isPhonePlaceholderEmail(value?: string) {
  return Boolean(value?.toLowerCase().endsWith("@phone.anushabazaar.local"));
}

function displayEmail(user: UserSummary) {
  if (!user.email || isPhonePlaceholderEmail(user.email)) {
    return null;
  }
  return user.email;
}

function primaryContact(user: UserSummary) {
  return displayEmail(user) ?? user.preferredContactEmail ?? user.preferredContactPhone ?? user.phone ?? `Customer #${user.id}`;
}

function accountGroup(user: UserSummary): AccountFilter {
  if (user.role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (user.role === "USER") return "WEBSITE";
  return "ADMIN";
}

function accountLabel(user: UserSummary) {
  if (user.role === "SUPER_ADMIN") return "Super Admin";
  if (user.role === "USER") return "Website User";
  return "Admin";
}

export function UsersPage({ mode = "customers" }: UsersPageProps) {
  const { data: users = [], refetch } = useQuery({ queryKey: ["admin-users"], queryFn: adminApi.getUsers });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>(mode === "roles" ? "ALL" : "WEBSITE");

  const websiteUsers = users.filter((user) => user.role === "USER");
  const adminUsers = users.filter((user) => user.role !== "USER" && user.role !== "SUPER_ADMIN");
  const superAdmins = users.filter((user) => user.role === "SUPER_ADMIN");
  const activeUsers = users.filter((user) => user.active).length;
  const blockedUsers = users.filter((user) => !user.active).length;
  const customerRevenue = websiteUsers.reduce((sum, user) => sum + Number(user.totalSpent ?? 0), 0);
  const cartUnits = websiteUsers.reduce((sum, user) => sum + Number(user.cartQuantity ?? 0), 0);
  const wishlistItems = websiteUsers.reduce((sum, user) => sum + Number(user.wishlistCount ?? 0), 0);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const email = displayEmail(user) ?? "";
      const searchMatch = `${user.name} ${email} ${user.phone ?? ""} ${user.preferredContactPhone ?? ""} ${user.role}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? user.active : !user.active;
      const accountMatch = accountFilter === "ALL" ? true : accountGroup(user) === accountFilter;
      return searchMatch && statusMatch && accountMatch;
    });
  }, [accountFilter, search, statusFilter, users]);

  const roleStats = useMemo(
    () =>
      Object.entries(
        users.reduce<Record<string, number>>((acc, user) => {
          const label = accountLabel(user);
          acc[label] = (acc[label] ?? 0) + 1;
          return acc;
        }, {})
      ).sort((left, right) => right[1] - left[1]),
    [users]
  );

  const copy =
    mode === "roles"
      ? {
          eyebrow: "System",
          title: "Users & roles",
          description: "Separate website customers, admin users, and Super Admin accounts in one clean access view."
        }
      : {
          eyebrow: "Commerce",
          title: "Website users",
          description: "Review customer accounts from the website without showing internal phone-login email placeholders."
      };

  async function handleExportCustomers() {
    try {
      downloadBlob(await adminApi.exportCustomers(), "customers.csv");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export customers"));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          mode === "customers" ? (
            <button type="button" className="admin-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold" onClick={handleExportCustomers}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={mode === "roles" ? "All Accounts" : "Website Value"}
            value={mode === "roles" ? String(users.length) : formatCurrency(customerRevenue)}
            meta={`${filteredUsers.length} in view`}
            icon={mode === "roles" ? <UsersIcon className="h-5 w-5" /> : <IndianRupee className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="Website Users"
            value={String(websiteUsers.length)}
            meta={`${cartUnits} cart units / ${wishlistItems} saved`}
            icon={<Phone className="h-5 w-5" />}
            accentClassName="bg-cyan-50 text-cyan-700"
            trend="flat"
          />
          <StatCard
            label="Admins"
            value={String(adminUsers.length)}
            meta={`${activeUsers} active total`}
            icon={<UserCog className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend="flat"
          />
          <StatCard
            label="Super Admin"
            value={String(superAdmins.length)}
            meta={blockedUsers ? `${blockedUsers} blocked accounts` : "Full access accounts"}
            icon={<ShieldCheck className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend={blockedUsers ? "down" : "up"}
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated overflow-hidden rounded-[24px]">
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="admin-pill">Account overview</div>
              <h2 className="mt-3 text-xl font-black text-slate-950">Customers, admins, and Super Admins</h2>
              <p className="mt-1 text-sm text-slate-500">
                Website phone accounts are displayed by phone/contact only; internal placeholder emails are hidden.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              {superAdmins.length} super / {adminUsers.length} admin / {websiteUsers.length} website
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {roleStats.map(([role, count]) => (
            <article key={role} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${role === "Website User" ? "bg-slate-100 text-slate-600" : role === "Super Admin" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-[#1E63F2]"}`}>
                  {role === "Website User" ? <UsersIcon className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{role}</div>
                  <div className="mt-1 text-2xl font-black text-slate-950">{count}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FilterBar>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["ALL", "All accounts", users.length],
              ["WEBSITE", "Website users", websiteUsers.length],
              ["ADMIN", "Admins", adminUsers.length],
              ["SUPER_ADMIN", "Super Admin", superAdmins.length]
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                  accountFilter === value ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setAccountFilter(value as AccountFilter)}
              >
                {label} <span className={accountFilter === value ? "text-blue-100" : "text-slate-400"}>{count}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_220px_auto]">
            <SearchInput
              placeholder="Search name, phone, clean email, or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Blocked</option>
            </select>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {filteredUsers.length} rows
            </div>
          </div>
        </div>
      </FilterBar>

      <DataTable
        data={filteredUsers}
        rowKey={(user) => user.id}
        emptyState="No users match the current search."
        columns={[
          {
            key: "user",
            header: "Account",
            render: (user) => (
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${user.role === "SUPER_ADMIN" ? "bg-emerald-50 text-emerald-700" : user.role === "USER" ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"}`}>
                  {user.role === "USER" ? <UsersIcon className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-400">{primaryContact(user)}</div>
                </div>
              </div>
            )
          },
          {
            key: "contact",
            header: "Contact profile",
            render: (user) => {
              const cleanEmail = displayEmail(user);
              return (
                <div className="max-w-[260px] text-sm text-slate-600">
                  <div className="font-semibold text-slate-800">{user.preferredContactName || user.name}</div>
                  <div className="mt-1">{user.preferredContactPhone || user.phone || "Phone not provided"}</div>
                  {cleanEmail || user.preferredContactEmail ? (
                    <div className="truncate text-xs text-slate-400">{user.preferredContactEmail ?? cleanEmail}</div>
                  ) : (
                    <div className="truncate text-xs text-slate-400">Phone login customer</div>
                  )}
                  {user.defaultDeliveryAddress ? (
                    <div className="mt-2 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{user.defaultDeliveryAddress}</div>
                  ) : null}
                </div>
              );
            }
          },
          {
            key: "engagement",
            header: "Orders",
            render: (user) => (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="info">{user.ordersCount ?? 0} orders</StatusBadge>
                  <StatusBadge tone={Number(user.pendingOrdersCount ?? 0) > 0 ? "warning" : "neutral"}>{user.pendingOrdersCount ?? 0} pending</StatusBadge>
                </div>
                <div className="text-sm font-semibold text-slate-900">{formatCurrency(user.totalSpent)}</div>
                <div className="text-xs text-slate-400">Last: {formatDateTime(user.lastOrderAt)}</div>
              </div>
            )
          },
          {
            key: "intent",
            header: "Cart & wishlist",
            render: (user) => (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span>{user.cartQuantity ?? 0} units in {user.cartItemCount ?? 0} cart rows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span>{user.wishlistCount ?? 0} saved products</span>
                </div>
                <div className="text-xs text-slate-400">
                  {formatLabel(user.lastOrderStatus)} / {formatLabel(user.lastPaymentStatus)}
                </div>
              </div>
            )
          },
          {
            key: "status",
            header: "Status",
            render: (user) => (
              <div className="space-y-2">
                <StatusBadge tone={user.role === "SUPER_ADMIN" ? "success" : user.role === "USER" ? "neutral" : "info"}>
                  {accountLabel(user)}
                </StatusBadge>
                <StatusBadge tone={user.active ? "success" : "danger"}>{user.active ? "Active" : "Blocked"}</StatusBadge>
                <div className="text-xs text-slate-400">Joined {formatDate(user.createdAt)}</div>
              </div>
            )
          },
          {
            key: "actions",
            header: "Action",
            render: (user) => (
              <div className="flex flex-wrap items-center gap-2">
                {user.role === "USER" ? (
                  <Link
                    to={`/customers/${user.id}`}
                    className="admin-button-secondary inline-flex items-center gap-1.5 !py-1.5 !text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View 360
                  </Link>
                ) : null}
                <ActionButton
                  variant={user.active ? "secondary" : "primary"}
                  onClick={async () => {
                    try {
                      await adminApi.toggleUser(user.id);
                      toast.success("User status updated");
                      await refetch();
                    } catch (error) {
                      toast.error(getApiErrorMessage(error, "Failed to update user"));
                    }
                  }}
                >
                  {user.active ? "Disable" : "Enable"}
                </ActionButton>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
