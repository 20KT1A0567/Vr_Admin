import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Fingerprint, Globe2, LogIn, Search, ShieldCheck } from "lucide-react";
import { superAdminApi } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
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
    <div className="space-y-4">
      <PageHeader
        eyebrow="Access Control"
        title="Admin login history"
        description="Audit admin sign-ins, active sessions, IP traces, and failed access attempts from one compact control view."
      />

      <section className="admin-card-elevated overflow-hidden rounded-[22px]">
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="admin-pill">Session audit</div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Access signals</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Watch successful sign-ins, open sessions, failure reasons, and suspicious traces without leaving the access control workflow.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[720px] xl:grid-cols-4">
              <AuditMetric label="Records" value={String(items.length)} meta={`${loginHistoryQuery.data.totalElements} total`} icon={<Clock3 className="h-5 w-5" />} tone="blue" />
              <AuditMetric label="Success" value={String(successCount)} meta="Clean sign-ins" icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
              <AuditMetric label="Failures" value={String(failureCount)} meta="Blocked attempts" icon={<LogIn className="h-5 w-5" />} tone="red" />
              <AuditMetric label="Open" value={String(openSessionCount)} meta={`${suspiciousCount} review`} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 bg-slate-50/70 px-5 py-4 sm:px-6 lg:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input pl-11"
              placeholder="Search admin email, IP, browser, or failure reason"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LoginHistoryStatusFilter)}
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <span>Page {loginHistoryQuery.data.page + 1} / {Math.max(loginHistoryQuery.data.totalPages, 1)}</span>
            <button
              type="button"
              className="font-bold text-[#1E63F2] transition hover:text-[#154ED1]"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 sm:px-6">
          {filteredItems.length} records match the current filters
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
