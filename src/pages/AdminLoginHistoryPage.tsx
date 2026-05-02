import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, LogIn, ShieldCheck } from "lucide-react";
import { superAdminApi } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { EmptyState } from "components/admin/EmptyState";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";

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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Access Control"
        title="Admin login history"
        description="Audit sign-ins, logout traces, and suspicious session behavior from one cleaner access-control view."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Records on Page"
            value={String(items.length)}
            meta={`${loginHistoryQuery.data.totalElements} total audit events`}
            icon={<Clock3 className="h-5 w-5" />}
            accentClassName="bg-slate-100 text-slate-700"
            trend="flat"
          />
          <StatCard
            label="Success"
            value={String(successCount)}
            meta="Successful sign-ins"
            icon={<ShieldCheck className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend={successCount > 0 ? "up" : "flat"}
          />
          <StatCard
            label="Failures"
            value={String(failureCount)}
            meta="Blocked or failed attempts"
            icon={<LogIn className="h-5 w-5" />}
            accentClassName="bg-rose-50 text-rose-700"
            trend={failureCount > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Suspicious"
            value={String(suspiciousCount)}
            meta="Needs review"
            icon={<AlertTriangle className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend={suspiciousCount > 0 ? "down" : "flat"}
          />
        </div>
      </PageHeader>

      <FilterBar
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>{filteredItems.length} records match the current filters</span>
            <button
              type="button"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-[1.4fr_220px_auto]">
          <SearchInput
            placeholder="Search admin email, IP, device, or failure reason"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LoginHistoryStatusFilter)}
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Page {loginHistoryQuery.data.page + 1} of {Math.max(loginHistoryQuery.data.totalPages, 1)}
          </div>
        </div>
      </FilterBar>

      <DataTable
        data={filteredItems}
        rowKey={(entry) => entry.id}
        emptyState="No login history entries match the current view."
        columns={[
          {
            key: "admin",
            header: "Admin",
            render: (entry) => (
              <div>
                <div className="font-semibold text-slate-900">{entry.adminEmail ?? "Unknown admin"}</div>
                <div className="text-xs text-slate-400">Session #{entry.sessionId ?? "--"}</div>
              </div>
            )
          },
          {
            key: "status",
            header: "Status",
            render: (entry) => (
              <StatusBadge tone={getStatusTone(entry.status)} dot>
                {formatStatus(entry.status)}
              </StatusBadge>
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
              <div className="space-y-1">
                <div className="text-sm text-slate-900">{entry.ipAddress ?? "--"}</div>
                <div className="max-w-[260px] truncate text-xs text-slate-400">{entry.userAgent ?? "Device unavailable"}</div>
              </div>
            )
          },
          {
            key: "reason",
            header: "Notes",
            render: (entry) => <span className="text-slate-500">{entry.failureReason ?? "--"}</span>
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
