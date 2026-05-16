import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Clock,
  KeyRound,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  ShieldCheck,
  ShieldOff,
  Store as StoreIcon,
  UserPlus,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage, superAdminApi } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { Drawer } from "components/admin/Drawer";
import { RoleChip, StatusChip, formatRole } from "components/admin/StatusChip";
import type {
  AdminCreatePayload,
  AdminModule,
  AdminPermissionEntry,
  AdminStatus,
  AdminUser,
  DayOfWeek,
  ManagedRole,
  PermissionAction,
  PermissionCatalog,
  Role,
  Store
} from "types";
import { DAYS_OF_WEEK } from "types";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; admin: AdminUser };

const statusOptions: AdminStatus[] = ["ACTIVE", "DISABLED", "SUSPENDED"];

const moduleLabels: Record<AdminModule, string> = {
  DASHBOARD: "Dashboard",
  PRODUCTS: "Products",
  CATEGORIES: "Categories",
  BRANDS: "Brands",
  STORES: "Stores",
  BANNERS: "Banners",
  COUPONS: "Coupons",
  REVIEWS: "Reviews",
  ORDERS: "Orders",
  CUSTOMERS: "Customers",
  INVENTORY: "Inventory",
  ENQUIRIES: "Enquiries",
  SERVICES: "Services",
  SETTINGS: "Settings",
  REPORTS: "Reports",
  ADMINS: "Admin Users",
  WEBSITE_CONTENT: "Website Content"
};

const actionLabels: Record<PermissionAction, string> = {
  VIEW: "View",
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  APPROVE: "Approve",
  EXPORT: "Export",
  ASSIGN: "Assign"
};

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function permissionKey(module: AdminModule, action: PermissionAction) {
  return `${module}:${action}`;
}

function getManagedRoles(catalog?: PermissionCatalog): ManagedRole[] {
  if (catalog?.managedRoles?.length) {
    return catalog.managedRoles;
  }

  return (catalog?.roles ?? ["MANAGER"]).map((role) => ({
    roleKey: role,
    displayName: formatRole(role),
    description: undefined,
    baseRole: role,
    active: true,
    protectedRole: role === "SUPER_ADMIN",
    systemRole: true,
    adminCount: 0
  }));
}

function resolveManagedRole(catalog: PermissionCatalog | undefined, roleKey?: string, fallbackRole?: Role) {
  const roles = getManagedRoles(catalog);
  return (
    roles.find((role) => role.roleKey === roleKey) ??
    roles.find((role) => role.baseRole === fallbackRole) ??
    roles[0] ??
    null
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, roleFilter]);

  const adminsQuery = useQuery({
    queryKey: ["super-admin-admins", { search: searchTerm, role: roleFilter, page }],
    queryFn: () =>
      superAdminApi.listAdmins({
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        page,
        size: 20
      })
  });

  const catalogQuery = useQuery({
    queryKey: ["super-admin-permission-catalog"],
    queryFn: superAdminApi.getPermissionCatalog
  });

  const storesQuery = useQuery({
    queryKey: ["super-admin-stores"],
    queryFn: superAdminApi.getStores
  });

  const admins = adminsQuery.data?.items ?? [];

  const totals = useMemo(() => {
    return {
      total: adminsQuery.data?.totalElements ?? 0,
      active: admins.filter((admin) => admin.status === "ACTIVE").length,
      disabled: admins.filter((admin) => admin.status !== "ACTIVE").length,
      superAdmins: admins.filter((admin) => admin.role === "SUPER_ADMIN").length
    };
  }, [admins, adminsQuery.data?.totalElements]);

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminStatus }) => superAdminApi.setStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update status"))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => superAdminApi.deleteAdmin(id),
    onSuccess: () => {
      toast.success("Admin disabled");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to disable admin"))
  });

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Super Admin</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">
              Admin user management
            </h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              Create administrators, assign roles, scope them to specific stores, and control fine-grained module access.
              Activity is logged automatically.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard label="Total admins" value={totals.total} icon={Users} />
            <KpiCard label="Active" value={totals.active} icon={ShieldCheck} accent="emerald" />
            <KpiCard label="Disabled / suspended" value={totals.disabled} icon={ShieldOff} accent="rose" />
            <KpiCard label="Super admins" value={totals.superAdmins} icon={ShieldCheck} accent="violet" />
          </div>
        </div>
      </section>

      <section className="admin-shell px-6 py-4 lg:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input pl-11"
              placeholder="Search by name, email, phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="admin-select w-full sm:w-56"
            value={roleFilter}
            onChange={(event) => setRoleFilter((event.target.value as Role) || "")}
          >
            <option value="">All roles</option>
            {(catalogQuery.data?.roles ?? []).map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
          <button className="admin-button" onClick={() => setDrawer({ kind: "create" })}>
            <Plus className="mr-2 h-4 w-4" />
            New admin
          </button>
        </div>
      </section>

      <section className="admin-shell">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="admin-table-head">
              <tr>
                <th className="px-6 py-3 text-left">Admin</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Stores</th>
                <th className="px-6 py-3 text-left">Access window</th>
                <th className="px-6 py-3 text-left">Last login</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Loading admins…
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <UserPlus className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    No admins match the current filter.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="admin-table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
                          {admin.fullName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{admin.fullName}</div>
                          <div className="text-xs text-slate-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleChip role={admin.role} label={admin.roleName} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={admin.status} />
                    </td>
                    <td className="px-6 py-4">
                      {admin.stores.length === 0 ? (
                        <span className="text-xs text-slate-400">All stores</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {admin.stores.slice(0, 2).map((store) => (
                            <span key={store.id} className="admin-chip">
                              <MapPin className="h-3 w-3" /> {store.name}
                            </span>
                          ))}
                          {admin.stores.length > 2 ? (
                            <span className="admin-chip">+{admin.stores.length - 2}</span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1.5">
                        {admin.accessStartDate || admin.accessEndDate ? (
                          <div className="text-xs">
                            <div>{formatDate(admin.accessStartDate)}</div>
                            <div className="text-slate-400">→ {formatDate(admin.accessEndDate)}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No expiry</span>
                        )}
                        {admin.allowedLoginStartTime && admin.allowedLoginEndTime ? (
                          <div className="text-[11px] text-slate-500">
                            <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
                            {admin.allowedLoginStartTime}–{admin.allowedLoginEndTime}
                          </div>
                        ) : null}
                        {admin.allowedLoginDays && admin.allowedLoginDays.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {admin.allowedLoginDays.map((day) => (
                              <span key={day} className="admin-chip" style={{ padding: "2px 6px", fontSize: "10px" }}>
                                {DAYS_OF_WEEK.find((d) => d.key === day)?.short ?? day}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {admin.twoFactorEnabled ? (
                          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-600">
                            <ShieldCheck className="-mt-0.5 mr-1 inline h-3 w-3" /> 2FA on
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDateTime(admin.lastLoginAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="admin-icon-button"
                          title="Edit"
                          onClick={() => setDrawer({ kind: "edit", admin })}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="admin-icon-button"
                          title={admin.status === "ACTIVE" ? "Disable" : "Activate"}
                          onClick={() =>
                            setStatusMutation.mutate({
                              id: admin.id,
                              status: admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
                            })
                          }
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          className="admin-icon-button-danger"
                          title="Disable & remove"
                          onClick={() => setPendingDelete(admin)}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {adminsQuery.data ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-sm text-slate-500">
            <div>
              Page {adminsQuery.data.page + 1} of {Math.max(adminsQuery.data.totalPages, 1)} —{" "}
              {adminsQuery.data.totalElements} admin{adminsQuery.data.totalElements === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="admin-button-secondary px-3 py-1.5 text-sm"
                disabled={adminsQuery.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                className="admin-button-secondary px-3 py-1.5 text-sm"
                disabled={adminsQuery.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <AdminDrawer
        mode={drawer}
        onClose={() => setDrawer({ kind: "closed" })}
        catalog={catalogQuery.data}
        stores={storesQuery.data ?? []}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        loading={deleteMutation.isPending}
        title={pendingDelete ? `Disable ${pendingDelete.fullName}?` : "Disable admin?"}
        description="This action removes the administrator from active access and disables their admin account."
        confirmLabel="Disable admin"
        tone="danger"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "slate"
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: "slate" | "emerald" | "rose" | "violet";
}) {
  const accentClass = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700"
  }[accent];
  return (
    <article className="admin-shell-muted p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="admin-display mt-1 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
      </div>
    </article>
  );
}

interface AdminDrawerProps {
  mode: DrawerMode;
  onClose: () => void;
  catalog: PermissionCatalog | undefined;
  stores: Store[];
}

type DrawerTab = "profile" | "permissions" | "stores" | "password" | "activity";

function AdminDrawer({ mode, onClose, catalog, stores }: AdminDrawerProps) {
  const isOpen = mode.kind !== "closed";
  const [tab, setTab] = useState<DrawerTab>("profile");

  useEffect(() => {
    if (isOpen) setTab("profile");
  }, [isOpen, mode.kind === "edit" ? mode.admin.id : null]);

  if (!isOpen) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        <div />
      </Drawer>
    );
  }

  if (mode.kind === "create") {
    return <CreateAdminDrawer open onClose={onClose} stores={stores} catalog={catalog} />;
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={mode.admin.fullName}
      subtitle={`${mode.admin.roleName ?? formatRole(mode.admin.role)} • ${mode.admin.email}`}
    >
      <div className="admin-segmented-control mb-5 flex flex-wrap gap-1 border-b-0">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={Users} label="Profile" />
        <TabButton
          active={tab === "permissions"}
          onClick={() => setTab("permissions")}
          icon={ShieldCheck}
          label="Permissions"
        />
        <TabButton active={tab === "stores"} onClick={() => setTab("stores")} icon={StoreIcon} label="Stores" />
        <TabButton active={tab === "password"} onClick={() => setTab("password")} icon={KeyRound} label="Password" />
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={Activity} label="Activity" />
      </div>

      {tab === "profile" ? <EditProfileSection admin={mode.admin} stores={stores} catalog={catalog} onSaved={onClose} /> : null}
      {tab === "permissions" && catalog ? (
        <PermissionsSection adminId={mode.admin.id} catalog={catalog} role={mode.admin.role} />
      ) : null}
      {tab === "stores" ? <StoresSection admin={mode.admin} stores={stores} /> : null}
      {tab === "password" ? <ResetPasswordSection adminId={mode.admin.id} /> : null}
      {tab === "activity" ? <ActivitySection adminId={mode.admin.id} /> : null}
    </Drawer>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "admin-segmented-option admin-segmented-option-active" : "admin-segmented-option"}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

interface AdminFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role | "";
  roleKey: string;
  accessStartDate: string;
  accessEndDate: string;
  allowedLoginStartTime: string;
  allowedLoginEndTime: string;
  allowedLoginDays: DayOfWeek[];
  twoFactorEnabled: boolean;
  storeIds: number[];
}

function emptyForm(): AdminFormState {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    roleKey: "",
    accessStartDate: "",
    accessEndDate: "",
    allowedLoginStartTime: "",
    allowedLoginEndTime: "",
    allowedLoginDays: [],
    twoFactorEnabled: false,
    storeIds: []
  };
}

function DayOfWeekPicker({
  value,
  onChange,
  disabled
}: {
  value: DayOfWeek[];
  onChange: (next: DayOfWeek[]) => void;
  disabled?: boolean;
}) {
  function toggle(day: DayOfWeek) {
    if (disabled) return;
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      const order = DAYS_OF_WEEK.map((d) => d.key);
      const next = [...value, day].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      onChange(next);
    }
  }

  function preset(label: "weekdays" | "weekend" | "all" | "clear") {
    if (disabled) return;
    if (label === "weekdays") onChange(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    else if (label === "weekend") onChange(["SATURDAY", "SUNDAY"]);
    else if (label === "all") onChange(DAYS_OF_WEEK.map((d) => d.key));
    else onChange([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day.key}
            type="button"
            className="admin-day-chip"
            data-active={value.includes(day.key)}
            onClick={() => toggle(day.key)}
            disabled={disabled}
            aria-pressed={value.includes(day.key)}
          >
            {day.short}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">
        <button type="button" onClick={() => preset("weekdays")} disabled={disabled} className="hover:text-[color:var(--color-text)] disabled:opacity-50">Mon–Fri</button>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => preset("weekend")} disabled={disabled} className="hover:text-[color:var(--color-text)] disabled:opacity-50">Weekend</button>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => preset("all")} disabled={disabled} className="hover:text-[color:var(--color-text)] disabled:opacity-50">All days</button>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => preset("clear")} disabled={disabled} className="hover:text-[color:var(--color-text)] disabled:opacity-50">Clear</button>
      </div>
    </div>
  );
}

function CreateAdminDrawer({
  open,
  onClose,
  stores,
  catalog
}: {
  open: boolean;
  onClose: () => void;
  stores: Store[];
  catalog: PermissionCatalog | undefined;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminFormState>(emptyForm());
  const roleOptions = useMemo(() => getManagedRoles(catalog).filter((role) => role.active), [catalog]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(emptyForm());
  }, [catalog, open]);

  const createMutation = useMutation({
    mutationFn: (payload: AdminCreatePayload) => superAdminApi.createAdmin(payload),
    onSuccess: () => {
      toast.success("Admin created");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      onClose();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to create admin"))
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (!form.role || !form.roleKey) {
      toast.error("Select the admin role to assign");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    createMutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      role: form.role,
      roleKey: form.roleKey,
      accessStartDate: form.accessStartDate || null,
      accessEndDate: form.accessEndDate || null,
      allowedLoginStartTime: form.allowedLoginStartTime || null,
      allowedLoginEndTime: form.allowedLoginEndTime || null,
      allowedLoginDays: form.allowedLoginDays,
      twoFactorEnabled: form.twoFactorEnabled,
      storeIds: form.storeIds
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create administrator"
      subtitle="Super Admin must enter the admin details, role, password, access window, and store scope."
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="admin-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-admin-form"
            className="admin-button"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create admin"}
          </button>
        </div>
      }
    >
      <form id="create-admin-form" className="space-y-5" onSubmit={handleSubmit}>
        <FormField label="Full name" required>
          <input
            className="admin-input"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            placeholder="Enter admin full name"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" required icon={Mail}>
            <input
              type="email"
              className="admin-input"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Enter admin email"
            />
          </FormField>
          <FormField label="Phone" icon={Phone}>
            <input
              className="admin-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+91…"
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role" required>
            <select
              className="admin-select"
              value={form.roleKey}
              onChange={(event) => {
                if (!event.target.value) {
                  setForm({ ...form, role: "", roleKey: "" });
                  return;
                }
                const selected = resolveManagedRole(catalog, event.target.value);
                if (!selected) return;
                setForm({ ...form, role: selected.baseRole, roleKey: selected.roleKey });
              }}
            >
              <option value="">Select role to assign</option>
              {roleOptions.map((roleOption) => (
                <option key={roleOption.roleKey} value={roleOption.roleKey}>
                  {roleOption.displayName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Temporary password" required icon={KeyRound}>
            <input
              type="text"
              className="admin-input"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Access starts" icon={Calendar}>
            <input
              type="date"
              className="admin-input"
              value={form.accessStartDate}
              onChange={(event) => setForm({ ...form, accessStartDate: event.target.value })}
            />
          </FormField>
          <FormField label="Access ends" icon={Calendar}>
            <input
              type="date"
              className="admin-input"
              value={form.accessEndDate}
              onChange={(event) => setForm({ ...form, accessEndDate: event.target.value })}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Working hours start" icon={Clock}>
            <input
              type="time"
              className="admin-input"
              value={form.allowedLoginStartTime}
              onChange={(event) => setForm({ ...form, allowedLoginStartTime: event.target.value })}
            />
          </FormField>
          <FormField label="Working hours end" icon={Clock}>
            <input
              type="time"
              className="admin-input"
              value={form.allowedLoginEndTime}
              onChange={(event) => setForm({ ...form, allowedLoginEndTime: event.target.value })}
            />
          </FormField>
        </div>
        <FormField
          label="Allowed login days"
          icon={Calendar}
          hint="Leave empty to allow login on every day. Selected days override the default."
        >
          <DayOfWeekPicker
            value={form.allowedLoginDays}
            onChange={(next) => setForm({ ...form, allowedLoginDays: next })}
          />
        </FormField>
        <FormField label="Two-factor authentication" hint="Email OTP is always enforced for SUPER_ADMIN. Enable here to require OTP for this admin too.">
          <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-3">
            <input
              type="checkbox"
              checked={form.twoFactorEnabled || form.role === "SUPER_ADMIN"}
              disabled={form.role === "SUPER_ADMIN"}
              onChange={(event) => setForm({ ...form, twoFactorEnabled: event.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm">
              Require email OTP at every login
              {form.role === "SUPER_ADMIN" ? (
                <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">
                  (always on for super admin)
                </span>
              ) : null}
            </span>
          </label>
        </FormField>
        <FormField label="Store access" hint="Leave empty to grant access to all stores (depending on role)">
          <StorePicker
            stores={stores}
            selected={form.storeIds}
            onChange={(ids) => setForm({ ...form, storeIds: ids })}
          />
        </FormField>
      </form>
    </Drawer>
  );
}

function EditProfileSection({
  admin,
  stores,
  catalog,
  onSaved
}: {
  admin: AdminUser;
  stores: Store[];
  catalog?: PermissionCatalog;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminFormState>({
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone ?? "",
    password: "",
    role: admin.role,
    roleKey: admin.roleKey ?? admin.role,
    accessStartDate: admin.accessStartDate ?? "",
    accessEndDate: admin.accessEndDate ?? "",
    allowedLoginStartTime: admin.allowedLoginStartTime ?? "",
    allowedLoginEndTime: admin.allowedLoginEndTime ?? "",
    allowedLoginDays: admin.allowedLoginDays ?? [],
    twoFactorEnabled: admin.twoFactorEnabled ?? admin.role === "SUPER_ADMIN",
    storeIds: admin.stores.map((store) => store.id)
  });
  const roleOptions = useMemo(() => {
    const roles = getManagedRoles(catalog);
    const currentRole = resolveManagedRole(catalog, admin.roleKey, admin.role);
    if (currentRole && !roles.some((role) => role.roleKey === currentRole.roleKey)) {
      return [...roles, currentRole];
    }
    return roles;
  }, [admin.role, admin.roleKey, catalog]);

  useEffect(() => {
    setForm({
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone ?? "",
      password: "",
      role: admin.role,
      roleKey: admin.roleKey ?? admin.role,
      accessStartDate: admin.accessStartDate ?? "",
      accessEndDate: admin.accessEndDate ?? "",
      allowedLoginStartTime: admin.allowedLoginStartTime ?? "",
      allowedLoginEndTime: admin.allowedLoginEndTime ?? "",
      allowedLoginDays: admin.allowedLoginDays ?? [],
      twoFactorEnabled: admin.twoFactorEnabled ?? admin.role === "SUPER_ADMIN",
      storeIds: admin.stores.map((store) => store.id)
    });
  }, [admin]);

  const updateMutation = useMutation({
    mutationFn: () =>
      superAdminApi.updateAdmin(admin.id, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role || undefined,
        roleKey: form.roleKey || undefined,
        accessStartDate: form.accessStartDate || null,
        accessEndDate: form.accessEndDate || null,
        allowedLoginStartTime: form.allowedLoginStartTime || null,
        allowedLoginEndTime: form.allowedLoginEndTime || null,
        allowedLoginDays: form.allowedLoginDays,
        twoFactorEnabled: form.twoFactorEnabled,
        storeIds: form.storeIds
      }),
    onSuccess: () => {
      toast.success("Admin updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      onSaved();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update admin"))
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        updateMutation.mutate();
      }}
    >
      <FormField label="Full name" required>
        <input
          className="admin-input"
          value={form.fullName}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" required icon={Mail}>
          <input
            type="email"
            className="admin-input"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </FormField>
        <FormField label="Phone" icon={Phone}>
          <input
            className="admin-input"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Role">
        <select
          className="admin-select"
          value={form.roleKey}
          onChange={(event) => {
            const selected = resolveManagedRole(catalog, event.target.value);
            if (!selected) return;
            setForm({ ...form, role: selected.baseRole, roleKey: selected.roleKey });
          }}
        >
          {roleOptions.map((roleOption) => (
            <option key={roleOption.roleKey} value={roleOption.roleKey}>
              {roleOption.displayName}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Access starts" icon={Calendar}>
          <input
            type="date"
            className="admin-input"
            value={form.accessStartDate}
            onChange={(event) => setForm({ ...form, accessStartDate: event.target.value })}
          />
        </FormField>
        <FormField label="Access ends" icon={Calendar}>
          <input
            type="date"
            className="admin-input"
            value={form.accessEndDate}
            onChange={(event) => setForm({ ...form, accessEndDate: event.target.value })}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Working hours start" icon={Clock}>
          <input
            type="time"
            className="admin-input"
            value={form.allowedLoginStartTime}
            onChange={(event) => setForm({ ...form, allowedLoginStartTime: event.target.value })}
          />
        </FormField>
        <FormField label="Working hours end" icon={Clock}>
          <input
            type="time"
            className="admin-input"
            value={form.allowedLoginEndTime}
            onChange={(event) => setForm({ ...form, allowedLoginEndTime: event.target.value })}
          />
        </FormField>
      </div>
      <FormField
        label="Allowed login days"
        icon={Calendar}
        hint="Leave empty to allow login on every day."
      >
        <DayOfWeekPicker
          value={form.allowedLoginDays}
          onChange={(next) => setForm({ ...form, allowedLoginDays: next })}
        />
      </FormField>
      <FormField label="Two-factor authentication" hint="Email OTP is always enforced for SUPER_ADMIN.">
        <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-3">
          <input
            type="checkbox"
            checked={form.twoFactorEnabled || admin.role === "SUPER_ADMIN"}
            disabled={admin.role === "SUPER_ADMIN"}
            onChange={(event) => setForm({ ...form, twoFactorEnabled: event.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm">
            Require email OTP at every login
            {admin.role === "SUPER_ADMIN" ? (
              <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">
                (always on for super admin)
              </span>
            ) : null}
          </span>
        </label>
      </FormField>
      <FormField label="Store access" hint="Empty = no specific store assignments">
        <StorePicker
          stores={stores}
          selected={form.storeIds}
          onChange={(ids) => setForm({ ...form, storeIds: ids })}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className="admin-button" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function PermissionsSection({
  adminId,
  catalog,
  role
}: {
  adminId: number;
  catalog: PermissionCatalog;
  role: Role;
}) {
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({
    queryKey: ["super-admin-permissions", adminId],
    queryFn: () => superAdminApi.getAdminPermissions(adminId)
  });

  const [draft, setDraft] = useState<Map<string, AdminPermissionEntry> | null>(null);

  useEffect(() => {
    if (permissionsQuery.data) {
      const map = new Map<string, AdminPermissionEntry>();
      permissionsQuery.data.entries.forEach((entry) => {
        map.set(permissionKey(entry.module, entry.action), entry);
      });
      setDraft(map);
    }
  }, [permissionsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft || !permissionsQuery.data) return Promise.reject(new Error("Permissions not loaded"));
      const overrides: { module: string; action: string; granted: boolean }[] = [];
      permissionsQuery.data.entries.forEach((original) => {
        const key = permissionKey(original.module, original.action);
        const current = draft.get(key);
        if (!current) return;
        const roleDefault = original.fromOverride ? !original.granted : original.granted;
        if (current.granted !== roleDefault) {
          overrides.push({ module: current.module, action: current.action, granted: current.granted });
        }
      });
      return superAdminApi.setAdminPermissions(adminId, overrides);
    },
    onSuccess: () => {
      toast.success("Permissions updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-permissions", adminId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to save permissions"))
  });

  if (permissionsQuery.isLoading || !draft || !permissionsQuery.data) {
    return <div className="text-sm text-slate-500">Loading permissions…</div>;
  }

  function toggle(module: AdminModule, action: PermissionAction) {
    const key = permissionKey(module, action);
    const next = new Map(draft);
    const current = next.get(key);
    if (!current) return;
    next.set(key, { ...current, granted: !current.granted });
    setDraft(next);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Toggling a cell creates a per-admin override on top of the <strong>{formatRole(role)}</strong> role
        defaults. Cells marked with a dot already differ from the role default.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              <th className="px-4 py-3 text-left">Module</th>
              {catalog.actions.map((action) => (
                <th key={action} className="px-4 py-3 text-center">
                  {actionLabels[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.modules.map((module) => (
              <tr key={module} className="admin-table-row">
                <td className="px-4 py-3 font-semibold text-slate-800">{moduleLabels[module]}</td>
                {catalog.actions.map((action) => {
                  const entry = draft.get(permissionKey(module, action));
                  const granted = entry?.granted ?? false;
                  const isOverride = entry?.fromOverride ?? false;
                  return (
                    <td key={action} className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(module, action)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                          granted ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                        title={`${moduleLabels[module]} • ${actionLabels[action]}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                            granted ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                        {isOverride ? (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button className="admin-button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving…" : "Save permissions"}
        </button>
      </div>
    </div>
  );
}

function StoresSection({ admin, stores }: { admin: AdminUser; stores: Store[] }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>(admin.stores.map((store) => store.id));

  useEffect(() => {
    setSelected(admin.stores.map((store) => store.id));
  }, [admin]);

  const mutation = useMutation({
    mutationFn: () => superAdminApi.setAdminStores(admin.id, selected),
    onSuccess: () => {
      toast.success("Store access updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update stores"))
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Store-scoped roles (e.g. Store Manager) only see data for the assigned stores. Super Admin, Admin, and
        Manager always have access to all stores regardless of this list.
      </div>

      <StorePicker stores={stores} selected={selected} onChange={setSelected} />

      <div className="flex justify-end">
        <button className="admin-button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save store access"}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordSection({ adminId }: { adminId: number }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mutation = useMutation({
    mutationFn: (next: string) => superAdminApi.resetPassword(adminId, next),
    onSuccess: () => {
      toast.success("Password reset");
      setPassword("");
      setConfirm("");
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to reset password"))
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        if (password !== confirm) {
          toast.error("Passwords do not match");
          return;
        }
        mutation.mutate(password);
      }}
    >
      <FormField label="New password" required>
        <input
          type="text"
          className="admin-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
        />
      </FormField>
      <FormField label="Confirm password" required>
        <input
          type="text"
          className="admin-input"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
      </FormField>
      <div className="flex justify-end">
        <button className="admin-button" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Resetting…" : "Reset password"}
        </button>
      </div>
    </form>
  );
}

function ActivitySection({ adminId }: { adminId: number }) {
  const [page, setPage] = useState(0);
  const activityQuery = useQuery({
    queryKey: ["super-admin-activity", adminId, page],
    queryFn: () => superAdminApi.getAdminActivity(adminId, page, 15)
  });

  if (activityQuery.isLoading) return <div className="text-sm text-slate-500">Loading activity…</div>;
  const items = activityQuery.data?.items ?? [];

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No activity recorded yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{entry.description ?? entry.action}</div>
                <div className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</div>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                {entry.module ? <span className="admin-chip">{moduleLabels[entry.module]}</span> : null}
                {entry.action ? <span className="admin-chip">{actionLabels[entry.action]}</span> : null}
                {entry.entityType ? (
                  <span className="admin-chip">
                    {entry.entityType}
                    {entry.entityId ? `#${entry.entityId}` : ""}
                  </span>
                ) : null}
                {entry.ipAddress ? <span className="admin-chip">{entry.ipAddress}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {activityQuery.data ? (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            Page {activityQuery.data.page + 1} of {Math.max(activityQuery.data.totalPages, 1)}
          </div>
          <div className="flex gap-2">
            <button
              className="admin-button-secondary px-3 py-1.5 text-xs"
              disabled={activityQuery.data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <button
              className="admin-button-secondary px-3 py-1.5 text-xs"
              disabled={activityQuery.data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StorePicker({
  stores,
  selected,
  onChange
}: {
  stores: Store[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
    } else {
      onChange([...selected, id]);
    }
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {stores.length === 0 ? (
        <div className="text-sm text-slate-400">No stores configured yet.</div>
      ) : (
        stores.map((store) => {
          const isSelected = selected.includes(store.id);
          return (
            <button
              type="button"
              key={store.id}
              onClick={() => toggle(store.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="font-semibold">{store.name}</div>
                <div className="text-xs text-slate-500">{store.city}</div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                }`}
              />
            </button>
          );
        })
      )}
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  icon: Icon,
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  icon?: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </div>
      {children}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </label>
  );
}
