import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LockKeyhole,
  MailPlus,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus
} from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage, superAdminApi } from "api/client";
import { formatRole } from "components/admin/StatusChip";
import type {
  AdminCreatePayload,
  AdminModule,
  PermissionAction,
  Role,
  RolePermissionEntry
} from "types";

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

type PageMode = "manage" | "create-role" | "create-admin";

function permissionKey(module: AdminModule, action: PermissionAction) {
  return `${module}:${action}`;
}

function emptyCreateForm(baseRole: Role = "SUPER_ADMIN") {
  return {
    roleKey: "",
    displayName: "",
    description: "",
    baseRole
  };
}

function emptyAdminForm(roleKey = "SUPER_ADMIN", role: Role = "SUPER_ADMIN"): AdminCreatePayload {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role,
    roleKey,
    storeIds: []
  };
}

export function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PageMode>("manage");
  const [selectedRoleKey, setSelectedRoleKey] = useState("MANAGER");
  const [draft, setDraft] = useState<Map<string, boolean> | null>(null);
  const [roleForm, setRoleForm] = useState({ displayName: "", description: "", active: true });
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [adminForm, setAdminForm] = useState<AdminCreatePayload>(emptyAdminForm());

  const catalogQuery = useQuery({
    queryKey: ["super-admin-permission-catalog"],
    queryFn: superAdminApi.getPermissionCatalog
  });

  const rolesQuery = useQuery({
    queryKey: ["super-admin-roles"],
    queryFn: superAdminApi.listRoles
  });

  const storesQuery = useQuery({
    queryKey: ["super-admin-stores"],
    queryFn: superAdminApi.getStores,
    enabled: mode === "create-admin"
  });

  const roles = rolesQuery.data ?? [];
  const managedRoleOptions = useMemo(() => roles.filter((role) => role.active), [roles]);
  const selectedRole = useMemo(() => {
    return roles.find((entry) => entry.roleKey === selectedRoleKey) ?? roles[0] ?? null;
  }, [roles, selectedRoleKey]);

  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRoleKey(roles[0].roleKey);
    }
  }, [roles, selectedRole]);

  useEffect(() => {
    if (!selectedRole) {
      setDraft(null);
      return;
    }
    const map = new Map<string, boolean>();
    selectedRole.entries.forEach((entry) => {
      map.set(permissionKey(entry.module, entry.action), entry.granted);
    });
    setDraft(map);
    setRoleForm({
      displayName: selectedRole.displayName,
      description: selectedRole.description ?? "",
      active: selectedRole.active
    });
  }, [selectedRole]);

  useEffect(() => {
    const firstBaseRole = catalogQuery.data?.roles.find((role) => role === "SUPER_ADMIN") ?? catalogQuery.data?.roles[0] ?? "SUPER_ADMIN";
    setCreateForm((current) => ({ ...current, baseRole: current.baseRole ?? firstBaseRole }));
  }, [catalogQuery.data]);

  useEffect(() => {
    if (managedRoleOptions.length === 0) return;
    setAdminForm((current) => {
      if (current.roleKey && managedRoleOptions.some((role) => role.roleKey === current.roleKey)) {
        return current;
      }
      const firstRole = managedRoleOptions.find((role) => role.baseRole === "SUPER_ADMIN") ?? managedRoleOptions[0];
      return { ...current, role: firstRole.baseRole, roleKey: firstRole.roleKey };
    });
  }, [managedRoleOptions]);

  const createBaseRoleOptions = catalogQuery.data?.roles ?? [];

  const savePermissionsMutation = useMutation({
    mutationFn: () => {
      if (!draft || !catalogQuery.data || !selectedRole) {
        return Promise.reject(new Error("Role data not loaded"));
      }
      const payload: RolePermissionEntry[] = [];
      catalogQuery.data.modules.forEach((module) => {
        catalogQuery.data.actions.forEach((action) => {
          payload.push({
            module,
            action,
            granted: action === "DELETE" ? false : draft.get(permissionKey(module, action)) ?? false
          });
        });
      });
      return superAdminApi.setRolePermissions(selectedRole.roleKey, payload);
    },
    onSuccess: () => {
      toast.success("Role permissions saved");
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to save role permissions"))
  });

  const saveRoleMutation = useMutation({
    mutationFn: () => {
      if (!selectedRole) {
        return Promise.reject(new Error("Role data not loaded"));
      }
      return superAdminApi.updateRole(selectedRole.roleKey, {
        displayName: roleForm.displayName.trim(),
        description: roleForm.description.trim() || undefined,
        active: roleForm.active
      });
    },
    onSuccess: () => {
      toast.success("Role details saved");
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-permission-catalog"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update role"))
  });

  const createRoleMutation = useMutation({
    mutationFn: () =>
      superAdminApi.createRole({
        roleKey: createForm.roleKey.trim(),
        displayName: createForm.displayName.trim(),
        description: createForm.description.trim() || undefined,
        baseRole: createForm.baseRole
      }),
    onSuccess: (createdRole) => {
      toast.success("Role created");
      setCreateForm(emptyCreateForm(createForm.baseRole));
      setSelectedRoleKey(createdRole.roleKey);
      setMode("manage");
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-permission-catalog"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to create role"))
  });

  const createAdminMutation = useMutation({
    mutationFn: () => {
      const assignedRole = managedRoleOptions.find((role) => role.roleKey === adminForm.roleKey);
      const payload: AdminCreatePayload = {
        ...adminForm,
        fullName: adminForm.fullName.trim(),
        email: adminForm.email.trim(),
        phone: adminForm.phone?.trim() || undefined,
        role: assignedRole?.baseRole ?? adminForm.role,
        roleKey: assignedRole?.roleKey ?? adminForm.roleKey,
        storeIds: adminForm.storeIds ?? []
      };
      return superAdminApi.createAdmin(payload);
    },
    onSuccess: () => {
      toast.success("Admin email created and role assigned");
      const firstRole = managedRoleOptions.find((role) => role.baseRole === "SUPER_ADMIN") ?? managedRoleOptions[0];
      setAdminForm(emptyAdminForm(firstRole?.roleKey ?? "SUPER_ADMIN", firstRole?.baseRole ?? "SUPER_ADMIN"));
      setMode("manage");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to create admin"))
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleKey: string) => superAdminApi.deleteRole(roleKey),
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-permission-catalog"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to delete role"))
  });

  const isSuper = selectedRole?.baseRole === "SUPER_ADMIN";
  const isCoreSuperAdminRole = selectedRole?.roleKey === "SUPER_ADMIN" && selectedRole?.baseRole === "SUPER_ADMIN";
  const grantedCount = useMemo(() => {
    if (!draft) return 0;
    let count = 0;
    draft.forEach((value) => {
      if (value) count += 1;
    });
    return count;
  }, [draft]);

  const totalCount = (catalogQuery.data?.modules.length ?? 0) * (catalogQuery.data?.actions.length ?? 0);
  const deleteLockedText = "Delete access is reserved for Super Admin only.";

  function toggle(module: AdminModule, action: PermissionAction) {
    if (!draft || isSuper || action === "DELETE") return;
    const key = permissionKey(module, action);
    const next = new Map(draft);
    next.set(key, !(next.get(key) ?? false));
    setDraft(next);
  }

  function setAllForModule(module: AdminModule, value: boolean) {
    if (!draft || !catalogQuery.data || isSuper) return;
    const next = new Map(draft);
    catalogQuery.data.actions.forEach((action) => {
      next.set(permissionKey(module, action), action === "DELETE" ? false : value);
    });
    setDraft(next);
  }

  function reset() {
    if (!selectedRole) return;
    const map = new Map<string, boolean>();
    selectedRole.entries.forEach((entry) => {
      map.set(permissionKey(entry.module, entry.action), entry.action === "DELETE" ? false : entry.granted);
    });
    setDraft(map);
    setRoleForm({
      displayName: selectedRole.displayName,
      description: selectedRole.description ?? "",
      active: selectedRole.active
    });
    toast.success("Reverted unsaved changes");
  }

  function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createRoleMutation.mutate();
  }

  function handleCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAdminMutation.mutate();
  }

  function updateAdminRole(roleKey: string) {
    const selected = managedRoleOptions.find((role) => role.roleKey === roleKey);
    setAdminForm((current) => ({
      ...current,
      roleKey,
      role: selected?.baseRole ?? current.role
    }));
  }

  if (mode === "create-role") {
    return (
      <div className="space-y-4">
        <section className="admin-shell px-6 py-5 lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button type="button" className="admin-button-secondary mb-5" onClick={() => setMode("manage")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to roles
              </button>
              <div className="admin-pill">Create Role</div>
              <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">
                New access role
              </h1>
              <p className="mt-3 max-w-3xl text-slate-500">
                Create a Super Admin role for full delete access, or choose a lower base role for limited module access.
              </p>
            </div>
            <div className="admin-shell-muted px-5 py-4 text-sm text-slate-500">
              <LockKeyhole className="mb-3 h-5 w-5 text-emerald-600" />
                Super Admin based roles always receive full platform access, including delete.
            </div>
          </div>
        </section>

        <form className="admin-shell space-y-5 p-6" onSubmit={handleCreateRole}>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role key</div>
              <input
                className="admin-input"
                placeholder="E.g. REGION_MANAGER"
                value={createForm.roleKey}
                onChange={(event) => setCreateForm({ ...createForm, roleKey: event.target.value.toUpperCase() })}
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Display name</div>
              <input
                className="admin-input"
                placeholder="Region Manager"
                value={createForm.displayName}
                onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })}
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Base role</div>
              <select
                className="admin-select"
                value={createForm.baseRole}
                onChange={(event) => setCreateForm({ ...createForm, baseRole: event.target.value as Role })}
              >
                {createBaseRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</div>
              <textarea
                className="admin-input min-h-[120px]"
                placeholder="Short purpose and access intent"
                value={createForm.description}
                onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="admin-button-secondary" onClick={() => setMode("manage")}>
              Cancel
            </button>
            <button className="admin-button" disabled={createRoleMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {createRoleMutation.isPending ? "Creating..." : "Create role"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === "create-admin") {
    const stores = storesQuery.data ?? [];
    return (
      <div className="space-y-4">
        <section className="admin-shell px-6 py-5 lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button type="button" className="admin-button-secondary mb-5" onClick={() => setMode("manage")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to permissions
              </button>
              <div className="admin-pill">Create Admin Email</div>
              <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">
                Invite admin and assign role
              </h1>
              <p className="mt-3 max-w-3xl text-slate-500">
                Super Admin creates the login here and can assign Super Admin or limited roles to decide platform access.
              </p>
            </div>
            <article className="admin-shell-muted px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <MailPlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Access source</div>
                  <div className="admin-display text-xl font-semibold text-slate-950">Role based</div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <form className="admin-shell space-y-6 p-6" onSubmit={handleCreateAdmin}>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Full name</div>
              <input
                className="admin-input"
                placeholder="Admin full name"
                value={adminForm.fullName}
                onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })}
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</div>
              <input
                className="admin-input"
                type="email"
                placeholder="admin@example.com"
                value={adminForm.email}
                onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })}
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Password</div>
              <input
                className="admin-input"
                type="password"
                placeholder="Temporary password"
                value={adminForm.password}
                onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
                required
                minLength={8}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone optional</div>
              <input
                className="admin-input"
                placeholder="Contact phone"
                value={adminForm.phone ?? ""}
                onChange={(event) => setAdminForm({ ...adminForm, phone: event.target.value })}
              />
            </label>
            <label className="block lg:col-span-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assign role</div>
              <select className="admin-select" value={adminForm.roleKey ?? ""} onChange={(event) => updateAdminRole(event.target.value)}>
                {managedRoleOptions.map((role) => (
                  <option key={role.roleKey} value={role.roleKey}>
                    {role.displayName} - {role.roleKey}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="admin-shell-muted p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">Store access</div>
                <div className="text-xs text-slate-500">Leave empty for company-wide access roles.</div>
              </div>
              <span className="admin-badge-slate">{adminForm.storeIds?.length ?? 0} selected</span>
            </div>
            {storesQuery.isLoading ? (
              <div className="py-6 text-sm text-slate-500">Loading stores...</div>
            ) : stores.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">No stores available.</div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {stores.map((store) => {
                  const selected = adminForm.storeIds?.includes(store.id) ?? false;
                  return (
                    <label
                      key={store.id}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        selected ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span>
                        <span className="block font-semibold">{store.name}</span>
                        <span className="text-xs text-slate-500">{store.city}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = adminForm.storeIds ?? [];
                          setAdminForm({
                            ...adminForm,
                            storeIds: selected ? current.filter((id) => id !== store.id) : [...current, store.id]
                          });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3">
            <button type="button" className="admin-button-secondary" onClick={() => setMode("manage")}>
              Cancel
            </button>
            <button className="admin-button" disabled={createAdminMutation.isPending || managedRoleOptions.length === 0}>
              <UserPlus className="mr-2 h-4 w-4" />
              {createAdminMutation.isPending ? "Creating..." : "Create admin email"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Access Control</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">
              Roles &amp; Permissions
            </h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              Create admin emails, assign roles, and control module access from one Super Admin workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="admin-button-secondary" onClick={() => setMode("create-admin")}>
              <MailPlus className="mr-2 h-4 w-4" />
              Create admin email
            </button>
            <button type="button" className="admin-button" onClick={() => setMode("create-role")}>
              <Plus className="mr-2 h-4 w-4" />
              Create role
            </button>
            <article className="admin-shell-muted px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {selectedRole?.displayName ?? "Role"}
                  </div>
                  <div className="admin-display text-2xl font-semibold text-slate-950">
                    {grantedCount}
                    <span className="text-base text-slate-400"> / {totalCount}</span>
                  </div>
                  <div className="text-xs text-slate-500">permissions granted</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="admin-shell p-3">
            <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Managed roles
            </div>
            <ul className="space-y-1">
              {roles.map((role) => {
                const active = role.roleKey === selectedRoleKey;
                return (
                  <li key={role.roleKey}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleKey(role.roleKey)}
                      className={`flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{role.displayName}</div>
                        <div className={`text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>
                          {role.roleKey} . {formatRole(role.baseRole)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={role.active ? "admin-badge-green" : "admin-badge-slate"}>
                          {role.active ? "Active" : "Inactive"}
                        </span>
                        {active ? <ShieldCheck className="h-4 w-4" /> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="admin-shell p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                  <div className="admin-display text-lg font-semibold text-slate-950">Delete follows Super Admin access</div>
                <p className="mt-1 text-sm text-slate-500">
                  Assign a Super Admin based role to give delete access. Limited roles cannot receive delete overrides.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="admin-shell">
          {!selectedRole ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Loading role details...</div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div>
                  <div className="admin-display text-lg font-semibold text-slate-950">{selectedRole.displayName}</div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedRole.roleKey} . inherits {formatRole(selectedRole.baseRole)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="admin-button-secondary" onClick={reset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revert
                  </button>
                  <button className="admin-button" disabled={isSuper || savePermissionsMutation.isPending} onClick={() => savePermissionsMutation.mutate()}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSuper ? "Full access" : savePermissionsMutation.isPending ? "Saving..." : "Save permissions"}
                  </button>
                </div>
              </header>

              <div className="grid gap-4 border-b border-slate-100 px-6 py-5 lg:grid-cols-[1fr_220px]">
                <div className="space-y-4">
                  <label className="block">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Display name</div>
                    <input
                      className="admin-input"
                      value={roleForm.displayName}
                      onChange={(event) => setRoleForm({ ...roleForm, displayName: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</div>
                    <textarea
                      className="admin-input min-h-[96px]"
                      value={roleForm.description}
                      onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })}
                    />
                  </label>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</div>
                    <select
                      className="admin-select mt-1"
                      value={roleForm.active ? "ACTIVE" : "INACTIVE"}
                      onChange={(event) => setRoleForm({ ...roleForm, active: event.target.value === "ACTIVE" })}
                      disabled={isCoreSuperAdminRole}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={selectedRole.active ? "admin-badge-green" : "admin-badge-slate"}>
                      {selectedRole.active ? "Active" : "Inactive"}
                    </span>
                    <span className="admin-badge-slate">{selectedRole.adminCount} admin(s)</span>
                    {isCoreSuperAdminRole ? <span className="admin-badge-sky">System</span> : null}
                    {isCoreSuperAdminRole ? <span className="admin-badge-violet">Protected</span> : null}
                  </div>
                  <button
                    className="admin-button w-full"
                    disabled={saveRoleMutation.isPending}
                    onClick={() => saveRoleMutation.mutate()}
                  >
                    {isCoreSuperAdminRole ? <ShieldOff className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    {saveRoleMutation.isPending ? "Saving..." : "Save role details"}
                  </button>
                  {!isCoreSuperAdminRole ? (
                    <button
                      className="admin-button-secondary w-full !border-rose-200 !text-rose-700 hover:!bg-rose-50"
                      disabled={deleteRoleMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete role ${selectedRole.displayName}?`)) {
                          deleteRoleMutation.mutate(selectedRole.roleKey);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleteRoleMutation.isPending ? "Deleting..." : "Delete role"}
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500">The core Super Admin role cannot be deleted.</div>
                  )}
                  {!isCoreSuperAdminRole && selectedRole.adminCount > 0 ? (
                    <div className="text-xs text-slate-500">Deleting disables assigned admin accounts for this role.</div>
                  ) : null}
                </div>
              </div>

              {isSuper ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  Super Admin always has full access. This matrix is informational only.
                </div>
              ) : !draft || !catalogQuery.data ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">Loading permissions...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="admin-table-head">
                      <tr>
                        <th className="px-6 py-3 text-left">Module</th>
                        {catalogQuery.data.actions.map((action) => (
                          <th key={action} className="px-4 py-3 text-center">
                            {actionLabels[action]}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs">Bulk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogQuery.data.modules.map((module) => (
                        <tr key={module} className="admin-table-row">
                          <td className="px-6 py-3 font-semibold text-slate-800">{moduleLabels[module]}</td>
                          {catalogQuery.data.actions.map((action) => {
                            const locked = action === "DELETE";
                            const granted = locked ? false : draft.get(permissionKey(module, action)) ?? false;
                            return (
                              <td key={action} className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggle(module, action)}
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                    locked ? "cursor-not-allowed bg-slate-100" : granted ? "bg-emerald-500" : "bg-slate-200"
                                  }`}
                                  title={locked ? deleteLockedText : `${moduleLabels[module]} . ${actionLabels[action]}`}
                                  disabled={locked}
                                >
                                  <span
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition ${
                                      granted ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  >
                                    {locked ? <LockKeyhole className="h-3 w-3 text-slate-400" /> : null}
                                  </span>
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right text-xs">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="admin-icon-button h-7 w-12 rounded-lg text-[11px]"
                                onClick={() => setAllForModule(module, true)}
                              >
                                All
                              </button>
                              <button
                                type="button"
                                className="admin-icon-button h-7 w-12 rounded-lg text-[11px]"
                                onClick={() => setAllForModule(module, false)}
                              >
                                None
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
