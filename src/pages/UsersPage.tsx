import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";

type UsersPageMode = "customers" | "roles";

interface UsersPageProps {
  mode?: UsersPageMode;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function UsersPage({ mode = "customers" }: UsersPageProps) {
  const { data: users = [], refetch } = useQuery({ queryKey: ["admin-users"], queryFn: adminApi.getUsers });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchMatch = `${user.name} ${user.email} ${user.phone ?? ""} ${user.role}`.toLowerCase().includes(search.toLowerCase());
      const statusMatch =
        statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? user.active : !user.active;
      return searchMatch && statusMatch;
    });
  }, [search, statusFilter, users]);

  const activeUsers = users.filter((user) => user.active).length;
  const blockedUsers = users.filter((user) => !user.active).length;
  const adminUsers = users.filter((user) => user.role !== "USER").length;
  const customerUsers = users.filter((user) => user.role === "USER").length;

  const copy =
    mode === "roles"
      ? {
          eyebrow: "System",
          title: "Users & roles",
          description: "Review active accounts and quickly toggle access for customer and elevated roles."
        }
      : {
          eyebrow: "Commerce",
          title: "Customer directory",
          description: "A cleaner customer list for account checks, contact details, and activation status."
        };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Accounts"
            value={String(users.length)}
            meta={`${filteredUsers.length} in view`}
            icon={<UsersIcon className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="Active"
            value={String(activeUsers)}
            meta="Enabled accounts"
            icon={<ShieldCheck className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend="up"
          />
          <StatCard
            label="Blocked"
            value={String(blockedUsers)}
            meta="Disabled accounts"
            icon={<ShieldCheck className="h-5 w-5" />}
            accentClassName="bg-rose-50 text-rose-700"
            trend={blockedUsers > 0 ? "down" : "flat"}
          />
          <StatCard
            label={mode === "roles" ? "Elevated Roles" : "Customers"}
            value={String(mode === "roles" ? adminUsers : customerUsers)}
            meta={mode === "roles" ? "Non-customer accounts" : "User role accounts"}
            icon={<UsersIcon className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend="flat"
          />
        </div>
      </PageHeader>

      <FilterBar>
        <div className="grid gap-3 md:grid-cols-[1.4fr_220px_auto]">
          <SearchInput
            placeholder="Search name, email, phone, or role"
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
      </FilterBar>

      <DataTable
        data={filteredUsers}
        rowKey={(user) => user.id}
        emptyState="No users match the current search."
        columns={[
          {
            key: "user",
            header: "User",
            render: (user) => (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  {mode === "roles" && user.role !== "USER" ? <ShieldCheck className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
              </div>
            )
          },
          {
            key: "contact",
            header: "Contact",
            render: (user) => <span className="text-slate-600">{user.phone ?? "Not provided"}</span>
          },
          {
            key: "role",
            header: "Role",
            render: (user) => (
              <StatusBadge tone={user.role === "USER" ? "neutral" : "info"}>
                {user.role}
              </StatusBadge>
            )
          },
          {
            key: "joined",
            header: "Joined",
            render: (user) => <span className="text-slate-600">{formatDate(user.createdAt)}</span>
          },
          {
            key: "status",
            header: "Status",
            render: (user) => (
              <StatusBadge tone={user.active ? "success" : "danger"}>
                {user.active ? "Active" : "Blocked"}
              </StatusBadge>
            )
          },
          {
            key: "actions",
            header: "Action",
            render: (user) => (
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
            )
          }
        ]}
      />
    </div>
  );
}
