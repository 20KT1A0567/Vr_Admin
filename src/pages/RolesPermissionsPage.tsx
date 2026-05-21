import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  Info,
  LockKeyhole,
  MailPlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage, superAdminApi } from "api/client";
import { formatRole } from "components/admin/StatusChip";
import { cn } from "utils/cn";
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
  const [roleSearchInput, setRoleSearchInput] = useState("");
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

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => 
      role.displayName.toLowerCase().includes(roleSearchInput.toLowerCase()) ||
      role.roleKey.toLowerCase().includes(roleSearchInput.toLowerCase())
    );
  }, [roles, roleSearchInput]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole || !draft) return false;
    
    // Check role details
    if (roleForm.displayName !== selectedRole.displayName) return true;
    if (roleForm.description !== (selectedRole.description ?? "")) return true;
    if (roleForm.active !== selectedRole.active) return true;

    // Check permissions
    for (const [key, value] of draft.entries()) {
      const [module, action] = key.split(":");
      const original = selectedRole.entries.find(e => e.module === module && e.action === action);
      if (original?.granted !== value) return true;
    }

    return false;
  }, [selectedRole, roleForm, draft]);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] min-w-0 flex-col gap-6 overflow-x-hidden">
      <section className="min-w-0">
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_58%,#0f766e_100%)] p-5 text-white shadow-2xl sm:p-6 xl:p-8">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
          
          <div className="relative min-w-0">
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                  <Fingerprint className="h-3.5 w-3.5 text-sky-400" />
                  Security Command Center
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
                  Access <span className="text-white/60">Workbench</span>
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/75 sm:text-base sm:leading-7">
                  Define roles, manage permissions, and audit administrative access levels across the entire enterprise commerce suite.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <button 
                  type="button" 
                  className="admin-button-secondary !h-11 !rounded-2xl !border-white/20 !bg-white/10 !px-5 !text-white hover:!bg-white/20" 
                  onClick={() => setMode("create-admin")}
                >
                  <MailPlus className="mr-2 h-4 w-4" />
                  Invite Admin
                </button>
                <button 
                  type="button" 
                  className="admin-button !h-11 !rounded-2xl !bg-white !px-6 !text-[color:var(--color-primary)] hover:!bg-blue-50" 
                  onClick={() => setMode("create-role")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Role
                </button>
              </div>
            </div>

            <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Managed Roles</div>
                    <div className="text-2xl font-black">{roles.length}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Total Admins</div>
                    <div className="text-2xl font-black">{roles.reduce((acc, r) => acc + r.adminCount, 0)}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Granted Rules</div>
                    <div className="text-2xl font-black">{grantedCount}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <ShieldOff className="h-6 w-6 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Blocked Access</div>
                    <div className="text-2xl font-black">{totalCount - grantedCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-6">
          <section className="admin-card-elevated flex min-w-0 flex-col overflow-hidden p-0 backdrop-blur-xl">
            <div className="border-b border-slate-100/50 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Role Navigator</div>
                <div className="admin-pill bg-sky-500/10 text-sky-500 border-none">{filteredRoles.length} Roles</div>
              </div>
              <div className="relative mt-5">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  className="admin-input !h-12 !rounded-2xl pl-12 shadow-sm focus:ring-4 focus:ring-sky-500/5 dark:bg-slate-900/50" 
                  placeholder="Filter by name or key..." 
                  value={roleSearchInput}
                  onChange={(e) => setRoleSearchInput(e.target.value)}
                />
              </div>
            </div>
            
            <div className="max-h-[520px] overflow-y-auto p-3 scrollbar-thin">
              <div className="space-y-2">
                {filteredRoles.map((role) => {
                  const active = role.roleKey === selectedRoleKey;
                  const isSuperRole = role.baseRole === "SUPER_ADMIN";
                  
                  return (
                    <button
                      key={role.roleKey}
                      type="button"
                      onClick={() => setSelectedRoleKey(role.roleKey)}
                      className={cn(
                        "group relative flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-300",
                        active 
                          ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 dark:bg-white dark:text-slate-900" 
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                        active 
                          ? (isSuperRole ? "bg-sky-500/20 text-sky-400" : "bg-emerald-500/20 text-emerald-400")
                          : (isSuperRole ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400")
                      )}>
                        {isSuperRole ? <ShieldCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-sm font-black tracking-tight">{role.displayName}</div>
                        <div className={cn(
                          "mt-1 text-[10px] font-bold uppercase tracking-widest opacity-60",
                          active ? "text-inherit" : "text-slate-400"
                        )}>
                          {role.roleKey}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                         <div className={cn(
                          "rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-tighter",
                          role.active 
                            ? (active ? "bg-emerald-400 text-slate-900" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400")
                            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-500"
                        )}>
                          {role.active ? "Live" : "Hold"}
                        </div>
                        <div className="text-[10px] font-bold opacity-40">{role.adminCount} Admins</div>
                      </div>
                      
                      {active && (
                        <motion.div 
                          layoutId="nav-indicator" 
                          className="absolute -left-1 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.8)]" 
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-auto border-t border-slate-100/50 bg-slate-50/30 p-4 dark:border-white/5 dark:bg-white/5">
              <button 
                onClick={() => setMode("create-role")}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 shadow-sm transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                Add New Archetype
              </button>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50/30 p-5 dark:border-amber-500/10 dark:from-amber-500/5 dark:to-transparent">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm dark:bg-amber-500/20">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-amber-400">Governance Policy</div>
                <p className="mt-2 text-xs font-medium leading-6 text-amber-900/70 dark:text-amber-200/50">
                  <span className="font-bold text-amber-900 dark:text-amber-400 underline decoration-amber-500/30">Super Admin</span> roles inherit absolute system access. Recursive permission overrides are restricted to core identities to ensure transactional integrity.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          {!selectedRole ? (
            <div className="admin-card-elevated flex h-[500px] flex-col items-center justify-center bg-[radial-gradient(circle_at_center,var(--color-bg)_0%,transparent_100%)] text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl dark:bg-white dark:text-slate-900">
                  <Fingerprint className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Security Protocol Required</h3>
              <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
                Authorized credentials detected. Select a role profile from the navigator to commence access auditing.
              </p>
            </div>
          ) : (
            <div className="min-w-0 space-y-6">
              {/* Bento Grid Header */}
              <div className="grid min-w-0 gap-6 2xl:grid-cols-3">
                <section className="admin-card-elevated min-w-0 overflow-hidden p-0 backdrop-blur-xl 2xl:col-span-2">
                  <header className="flex flex-wrap items-center gap-4 border-b border-slate-100/50 bg-slate-50/30 px-5 py-5 dark:border-white/5 dark:bg-white/5 sm:px-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xl dark:bg-white dark:text-slate-900">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">{selectedRole.displayName}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{selectedRole.roleKey}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">Inherits {formatRole(selectedRole.baseRole)}</span>
                      </div>
                    </div>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                    <div className="space-y-6">
                      <div className="group">
                        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-focus-within:text-sky-500 transition-colors">
                          <Info className="h-3.5 w-3.5" />
                          Role Alias
                        </div>
                        <input
                          className="admin-input !h-14 !rounded-2xl bg-slate-50/50 text-sm font-bold shadow-inner focus:bg-white dark:bg-slate-900/50"
                          value={roleForm.displayName}
                          onChange={(event) => setRoleForm({ ...roleForm, displayName: event.target.value })}
                          disabled={isCoreSuperAdminRole}
                          placeholder="e.g. Regional Fleet Manager"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="group">
                        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-focus-within:text-sky-500 transition-colors">
                          <Fingerprint className="h-3.5 w-3.5" />
                          Security Intent
                        </div>
                        <textarea
                          className="admin-input !min-h-[100px] !rounded-2xl bg-slate-50/50 py-4 text-sm font-medium leading-relaxed shadow-inner focus:bg-white dark:bg-slate-900/50"
                          placeholder="What specific business outcome does this role enable?"
                          value={roleForm.description}
                          onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })}
                          disabled={isCoreSuperAdminRole}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex min-w-0 flex-col gap-6">
                  <div className="admin-card-elevated flex flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white dark:from-white dark:to-slate-100 dark:text-slate-900">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60">Impact Metric</div>
                        <div className="mt-3 text-4xl font-black">{selectedRole.adminCount}</div>
                        <div className="mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Active Administrators</div>
                      </div>
                      <Users className="h-8 w-8 opacity-20" />
                    </div>
                    <div className="mt-8 flex items-center gap-2">
                       <div className={cn(
                        "h-2 w-full rounded-full bg-white/10 dark:bg-slate-900/10",
                        "after:block after:h-full after:rounded-full after:bg-sky-400",
                        selectedRole.active ? "after:w-full" : "after:w-0"
                      )} />
                    </div>
                  </div>

                  <div className="admin-card-elevated p-5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                       <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Operational Status</div>
                       <div className={cn(
                         "h-2 w-2 rounded-full",
                         selectedRole.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                       )} />
                    </div>
                    <select
                      className="admin-select !h-12 !rounded-xl !bg-slate-50/50 !text-xs !font-black !shadow-none border-none dark:!bg-white/5"
                      value={roleForm.active ? "ACTIVE" : "INACTIVE"}
                      onChange={(event) => setRoleForm({ ...roleForm, active: event.target.value === "ACTIVE" })}
                      disabled={isCoreSuperAdminRole}
                    >
                      <option value="ACTIVE">LIVE PROTOCOL</option>
                      <option value="INACTIVE">DEACTIVATED</option>
                    </select>
                  </div>
                </section>
              </div>

              {/* Advanced Permission Matrix */}
              <section className="admin-card-elevated min-w-0 overflow-hidden p-0 backdrop-blur-xl">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 bg-slate-50/30 px-5 py-5 dark:border-white/5 dark:bg-white/5 sm:px-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-2xl shadow-indigo-500/20">
                      <LockKeyhole className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">Module Access Matrix</h2>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                        Granular capability definitions per system subsystem
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => saveRoleMutation.mutate()}
                      disabled={saveRoleMutation.isPending || isCoreSuperAdminRole}
                      className="group flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-95 dark:bg-white dark:text-slate-900"
                    >
                      <Save className="h-4 w-4" />
                      Commit Identity
                    </button>
                    {!isCoreSuperAdminRole && (
                      <button 
                         onClick={() => {
                          if (confirm(`Nuclear Option: Irreversibly delete role ${selectedRole.displayName}?`)) {
                            deleteRoleMutation.mutate(selectedRole.roleKey);
                          }
                        }}
                        disabled={deleteRoleMutation.isPending}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 transition-all hover:bg-rose-500 hover:text-white dark:border-rose-500/10 dark:bg-rose-500/5"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </header>

                {isSuper ? (
                  <div className="flex flex-col items-center justify-center px-10 py-32 text-center bg-[radial-gradient(circle_at_top,var(--color-bg)_0%,transparent_100%)]">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner dark:bg-emerald-500/10 dark:text-emerald-400">
                        <ShieldCheck className="h-12 w-12" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">Absolute Sovereignty</h3>
                    <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-slate-500">
                      Super Admin entities possess root-level authorization across all system nodes. Policy overrides are disabled for this tier to maintain architectural stability.
                    </p>
                  </div>
                ) : !draft || !catalogQuery.data ? (
                   <div className="flex h-[400px] flex-col items-center justify-center gap-4">
                    <div className="admin-spinner h-10 w-10 border-4 !border-t-sky-500" />
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Decrypting permissions...</div>
                  </div>
                ) : (
                  <div className="max-w-full overflow-x-auto">
                    <table className="min-w-[980px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-white/5">
                          <th className="sticky left-0 z-30 bg-slate-50/80 px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 backdrop-blur-md dark:bg-slate-900/80">
                            Functional Module
                          </th>
                          {catalogQuery.data.actions.map((action) => (
                            <th key={action} className="px-6 py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                              {actionLabels[action]}
                            </th>
                          ))}
                          <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            Automation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50 dark:divide-white/5">
                        {catalogQuery.data.modules.map((module) => (
                          <tr key={module} className="group hover:bg-slate-50/50 transition-colors dark:hover:bg-white/2">
                            <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 px-10 py-8 backdrop-blur-md transition-colors dark:bg-slate-900 dark:group-hover:bg-white/2">
                              <div className="flex items-center gap-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white">
                                  {/* Dummy icon logic for module icons */}
                                  <ChevronRight className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                                </div>
                                <div>
                                  <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white">{moduleLabels[module]}</div>
                                  <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{module}</div>
                                </div>
                              </div>
                            </td>
                            {catalogQuery.data.actions.map((action) => {
                              const locked = action === "DELETE";
                              const granted = locked ? false : draft.get(permissionKey(module, action)) ?? false;
                              
                              return (
                                <td key={action} className="px-6 py-8 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggle(module, action)}
                                    disabled={locked}
                                    className={cn(
                                      "relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500",
                                      locked 
                                        ? "cursor-not-allowed bg-slate-100 dark:bg-white/5" 
                                        : granted 
                                          ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                                          : "bg-slate-200 dark:bg-white/10"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-500",
                                        granted ? "translate-x-6" : "translate-x-1"
                                      )}
                                    >
                                      {locked && <LockKeyhole className="h-2.5 w-2.5 text-slate-300" />}
                                    </span>
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-10 py-8 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                <button
                                  type="button"
                                  className="rounded-xl bg-sky-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-sky-600 hover:bg-sky-500 hover:text-white transition-all"
                                  onClick={() => setAllForModule(module, true)}
                                >
                                  Authorize All
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-slate-900 transition-all"
                                  onClick={() => setAllForModule(module, false)}
                                >
                                  Revoke
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-[2.5rem] border border-slate-900/10 bg-white/80 p-2 pl-8 shadow-[0_24px_48px_rgba(15,23,42,0.15)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </div>
              <span className="text-sm font-black tracking-tight text-slate-900">Unsaved configuration changes detected</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                type="button" 
                className="admin-button-secondary !h-12 rounded-[2rem] px-6 text-xs font-black uppercase tracking-widest"
                onClick={reset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Discard
              </button>
              <button 
                type="button" 
                className="admin-button !h-12 rounded-[2rem] px-8 text-xs font-black uppercase tracking-widest shadow-xl shadow-[color:var(--color-primary)]/20"
                onClick={() => savePermissionsMutation.mutate()}
                disabled={savePermissionsMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {savePermissionsMutation.isPending ? "Syncing..." : "Sync Permissions"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
