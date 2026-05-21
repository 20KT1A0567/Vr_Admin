import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Fingerprint, Globe2, LogIn, Search, ShieldCheck } from "lucide-react";
import { superAdminApi } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import type { AdminLoginHistoryEntry } from "types";

type LoginHistoryStatusFilter = "ALL" | "SUCCESS" | "FAILURE";

function formatDateTime(value?: string) {
  if (!value) {
    return "--";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStatus(status?: string) {
  if (!status) {
    return "Unknown";
  }

  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status?: string) {
  if (status === "SUCCESS") {
    return "success";
  }

  if (status === "FAILURE") {
    return "danger";
  }

  return "neutral";
}

function getSessionDuration(entry: AdminLoginHistoryEntry) {
  if (!entry.loginAt || !entry.logoutAt) {
    return entry.logoutAt ? "Closed" : "Open session";
  }

  const start = Date.parse(entry.loginAt);
  const end = Date.parse(entry.logoutAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "Duration unavailable";
  }

  const minutes = Math.max(1, Math.round((end - start) / 60000));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getRiskTone(entry: AdminLoginHistoryEntry) {
  if (entry.status === "FAILURE" || entry.failureReason) {
    return "danger";
  }
  if (!entry.logoutAt) {
    return "warning";
  }
  return "success";
}

function getRiskLabel(entry: AdminLoginHistoryEntry) {
  if (entry.status === "FAILURE" || entry.failureReason) {
    return "Review";
  }
  if (!entry.logoutAt) {
    return "Open";
  }
  return "Clean";
}

export function AdminLoginHistoryPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoginHistoryStatusFilter>("ALL");

  const loginHistoryQuery = useQuery({
    queryKey: ["super-admin-login-history", page],
    queryFn: () => superAdminApi.getLoginHistory(page, 20)
  });

  const items = loginHistoryQuery.data?.items ?? [];
  const filteredItems = useMemo(() => {
    return items.filter((entry) => {
      const searchMatch = `${entry.adminEmail ?? ""} ${entry.ipAddress ?? ""} ${entry.userAgent ?? ""} ${entry.failureReason ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : entry.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [items, search, statusFilter]);

  const successCount = items.filter((entry) => entry.status === "SUCCESS").length;
  const failureCount = items.filter((entry) => entry.status === "FAILURE").length;
  const suspiciousCount = items.filter((entry) => entry.status !== "SUCCESS" || Boolean(entry.failureReason)).length;
  const openSessionCount = items.filter((entry) => entry.status === "SUCCESS" && !entry.logoutAt).length;

  if (loginHistoryQuery.isLoading && !loginHistoryQuery.data) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Access Control"
          title="Admin login history"
          description="Loading sign-in sessions, IP addresses, and device traces."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="admin-shell p-5">
              <SkeletonLoader lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!loginHistoryQuery.data) {
    return (
      <EmptyState
        title="Login history is unavailable"
        description="The super admin API did not return any audit records for login history."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security Operations"
        title="Access Audit Log"
        description="Audit sign-in sessions, active protocols, IP traces, and failed entry attempts across the administrative domain."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Traversal"
            value={String(loginHistoryQuery.data.totalElements)}
            meta="Cumulative audit trail"
            icon={<Clock3 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Verified Entry"
            value={String(successCount)}
            meta="Clean authentication Flow"
            icon={<ShieldCheck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Blocked Entry"
            value={String(failureCount)}
            meta="Rejected access attempts"
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Active Sessions"
            value={String(openSessionCount)}
            meta="Current protocol nodes"
            icon={<LogIn className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Audit Intelligence
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Session Telemetry Workspace</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Analyze the behavioral fingerprint of administrative traffic.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Security Trace</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-5 dark:bg-slate-900">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-[1.25rem] border-none bg-slate-50 py-4 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              placeholder="Identify session via email, network node, or trace reason…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-14 min-w-[200px] rounded-[1.25rem] border-none bg-slate-50 px-6 text-xs font-black uppercase tracking-[0.1em] text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LoginHistoryStatusFilter)}
          >
            <option value="ALL">All Event Statuses</option>
            <option value="SUCCESS">Verified Flow</option>
            <option value="FAILURE">Blocked Flow</option>
          </select>
          <div className="flex h-14 items-center justify-between gap-6 rounded-[1.25rem] border border-slate-100 bg-white px-6 text-xs dark:border-white/5 dark:bg-slate-800">
            <span className="font-black uppercase tracking-widest text-slate-400">Page {loginHistoryQuery.data.page + 1} / {Math.max(loginHistoryQuery.data.totalPages, 1)}</span>
            <button
              type="button"
              className="font-black uppercase tracking-widest text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <DataTable
        className="rounded-[22px]"
        data={filteredItems}
        rowKey={(entry) => entry.id}
        emptyState="No login history entries match the current view."
        columns={[
          {
            key: "admin",
            header: "Admin",
            render: (entry) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#1E63F2]">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-950">{entry.adminEmail ?? "Unknown admin"}</div>
                  <div className="text-xs text-slate-400">Session #{entry.sessionId ?? "--"} / {getSessionDuration(entry)}</div>
                </div>
              </div>
            )
          },
          {
            key: "status",
            header: "Status",
            render: (entry) => (
              <div className="space-y-2">
                <StatusBadge tone={getStatusTone(entry.status)} dot>{formatStatus(entry.status)}</StatusBadge>
                <StatusBadge tone={getRiskTone(entry)}>{getRiskLabel(entry)}</StatusBadge>
              </div>
            )
          },
          {
            key: "login",
            header: "Login Time",
            render: (entry) => <span className="text-slate-600">{formatDateTime(entry.loginAt)}</span>
          },
          {
            key: "logout",
            header: "Logout Time",
            render: (entry) => <span className="text-slate-600">{formatDateTime(entry.logoutAt)}</span>
          },
          {
            key: "network",
            header: "IP / Device",
            render: (entry) => (
              <div className="flex items-start gap-2">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 space-y-1">
                  <div className="font-semibold text-slate-900">{entry.ipAddress ?? "--"}</div>
                  <div className="max-w-[320px] truncate text-xs text-slate-400" title={entry.userAgent ?? undefined}>
                    {entry.userAgent ?? "Device unavailable"}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: "reason",
            header: "Notes",
            render: (entry) => (
              entry.failureReason ? (
                <span className="inline-flex max-w-[280px] rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-700">
                  {entry.failureReason}
                </span>
              ) : (
                <span className="text-slate-400">No issues</span>
              )
            )
          }
        ]}
      />

      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Showing page {loginHistoryQuery.data.page + 1} of {Math.max(loginHistoryQuery.data.totalPages, 1)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            variant="secondary"
            disabled={loginHistoryQuery.data.first}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Previous
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={loginHistoryQuery.data.last}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function AuditMetric({
  icon,
  label,
  meta,
  tone,
  value
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  tone: "amber" | "blue" | "green" | "red";
  value: string;
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-[#1E63F2] border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-rose-50 text-rose-700 border-rose-100"
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
          <div className="mt-2 text-xs font-semibold text-slate-500">{meta}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass}`}>{icon}</div>
      </div>
    </article>
  );
}
