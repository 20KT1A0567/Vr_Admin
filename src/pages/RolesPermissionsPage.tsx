import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Save, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage, superAdminApi } from "api/client";
import { formatRole } from "components/admin/StatusChip";
import type {
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

function permissionKey(module: AdminModule, action: PermissionAction) {
  return `${module}:${action}`;
}

function emptyCreateForm(baseRole: Role = "MANAGER") {
  return {
    roleKey: "",
    displayName: "",
    description: "",
    baseRole
  };
}

export function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRoleKey, setSelectedRoleKey] = useState("MANAGER");
  const [draft, setDraft] = useState<Map<string, boolean> | null>(null);
  const [roleForm, setRoleForm] = useState({ displayName: "", description: "", active: true });
  const [createForm, setCreateForm] = useState(emptyCreateForm());

  const catalogQuery = useQuery({
    queryKey: ["super-admin-permission-catalog"],
    queryFn: superAdminApi.getPermissionCatalog
  });

  const rolesQuery = useQuery({
    queryKey: ["super-admin-roles"],
    queryFn: superAdminApi.listRoles
  });

  const roles = rolesQuery.data ?? [];
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
    const firstBaseRole = catalogQuery.data?.roles.find((role) => role !== "SUPER_ADMIN") ?? "MANAGER";
    setCreateForm((current) => ({ ...current, baseRole: current.baseRole ?? firstBaseRole }));
  }, [catalogQuery.data]);

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
            granted: draft.get(permissionKey(module, action)) ?? false
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
      queryClient.invalidateQueries({ queryKey: ["super-admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-permission-catalog"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to create role"))
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
  const grantedCount = useMemo(() => {
    if (!draft) return 0;
    let count = 0;
    draft.forEach((value) => {
      if (value) count += 1;
    });
    return count;
  }, [draft]);

  const totalCount = (catalogQuery.data?.modules.length ?? 0) * (catalogQuery.data?.actions.length ?? 0);

  function toggle(module: AdminModule, action: PermissionAction) {
    if (!draft || isSuper) return;
    const key = permissionKey(module, action);
    const next = new Map(draft);
    next.set(key, !(next.get(key) ?? false));
    setDraft(next);
  }

  function setAllForModule(module: AdminModule, value: boolean) {
    if (!draft || !catalogQuery.data || isSuper) return;
    const next = new Map(draft);
    catalogQuery.data.actions.forEach((action) => {
      next.set(permissionKey(module, action), value);
    });
    setDraft(next);
  }

  function reset() {
    if (!selectedRole) return;
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
    toast.success("Reverted unsaved changes");
  }

  const createBaseRoleOptions = (catalogQuery.data?.roles ?? []).filter((role) => role !== "SUPER_ADMIN");

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
              Manage reusable admin roles, inherit a safe base capability set, and fine-tune the permission matrix per
              role key.
            </p>
          </div>

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
            <div className="admin-display text-lg font-semibold text-slate-950">Create role</div>
            <p className="mt-1 text-xs text-slate-500">
              New roles inherit a base enum role for Spring Security compatibility.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role key</div>
                <input
                  className="admin-input"
                  placeholder="E.g. REGION_MANAGER"
                  value={createForm.roleKey}
                  onChange={(event) => setCreateForm({ ...createForm, roleKey: event.target.value.toUpperCase() })}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Display name</div>
                <input
                  className="admin-input"
                  placeholder="Region Manager"
                  value={createForm.displayName}
                  onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })}
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
              <label className="block">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Description</div>
                <textarea
                  className="admin-input min-h-[96px]"
                  placeholder="Short purpose and access intent"
                  value={createForm.description}
                  onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
                />
              </label>
              <button
                className="admin-button w-full"
                disabled={createRoleMutation.isPending}
                onClick={() => createRoleMutation.mutate()}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createRoleMutation.isPending ? "Creating..." : "Create role"}
              </button>
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
                  <button className="admin-button" disabled={savePermissionsMutation.isPending} onClick={() => savePermissionsMutation.mutate()}>
                    <Save className="mr-2 h-4 w-4" />
                    {savePermissionsMutation.isPending ? "Saving..." : "Save permissions"}
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
                      disabled={selectedRole.protectedRole}
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
                    {selectedRole.systemRole ? <span className="admin-badge-sky">System</span> : null}
                    {selectedRole.protectedRole ? <span className="admin-badge-violet">Protected</span> : null}
                  </div>
                  <button
                    className="admin-button w-full"
                    disabled={saveRoleMutation.isPending}
                    onClick={() => saveRoleMutation.mutate()}
                  >
                    {selectedRole.protectedRole ? <ShieldOff className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    {saveRoleMutation.isPending ? "Saving..." : "Save role details"}
                  </button>
                  {!selectedRole.protectedRole ? (
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
                    <div className="text-xs text-slate-500">Protected roles cannot be deleted.</div>
                  )}
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
                            const granted = draft.get(permissionKey(module, action)) ?? false;
                            return (
                              <td key={action} className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggle(module, action)}
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                    granted ? "bg-emerald-500" : "bg-slate-200"
                                  }`}
                                  title={`${moduleLabels[module]} . ${actionLabels[action]}`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                                      granted ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  />
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
