import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.phone ?? ""} ${user.role}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, users]);

  const activeUsers = users.filter((user) => user.active).length;
  const adminUsers = users.filter((user) => user.role === "ADMIN").length;
  const customerUsers = users.filter((user) => user.role === "USER").length;

  const copy =
    mode === "roles"
      ? {
          label: "Users & Roles",
          title: "Control account activation and review who currently has elevated admin access.",
          description: "This screen matches the reference admin panel and keeps access management close to live user records."
        }
      : {
          label: "Customers",
          title: "A cleaner customer list for access checks, contact details, and account status.",
          description: "This page now uses the same light admin language as the reference board instead of the old dark cards."
        };

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">{copy.label}</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">{copy.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-500">{copy.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active accounts</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{activeUsers}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admins</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{adminUsers}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customers</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{customerUsers}</div>
            </article>
          </div>
        </div>
      </section>

      <section className="admin-shell p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] flex-1 max-w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" placeholder="Search name, email, phone, or role" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          {mode === "roles" ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Only {adminUsers} account(s) currently carry ADMIN access.</div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{filteredUsers.length} customer records</div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Phone</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Joined</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        {mode === "roles" && user.role === "ADMIN" ? <ShieldCheck className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{user.phone ?? "Not provided"}</td>
                  <td className="py-4 pr-4">
                    <span className={user.role === "ADMIN" ? "admin-badge-amber" : "admin-badge-slate"}>{user.role}</span>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="py-4 pr-4">
                    <span className={user.active ? "admin-badge-green" : "admin-badge-slate"}>{user.active ? "Active" : "Disabled"}</span>
                  </td>
                  <td className="py-4">
                    <button
                      className={user.active ? "admin-button-secondary !px-4 !py-2" : "admin-button !px-4 !py-2"}
                      onClick={async () => {
                        await adminApi.toggleUser(user.id);
                        toast.success("User status updated");
                        await refetch();
                      }}
                    >
                      {user.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredUsers.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
