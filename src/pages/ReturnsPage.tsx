import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarClock, CheckCircle2, ClipboardCheck, PackageCheck, RotateCcw, Search, WalletCards, XCircle } from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { PageHeader } from "components/admin/PageHeader";
import { StatusBadge } from "components/admin/StatusBadge";
import { StatCard } from "components/admin/StatCard";
import type { ReturnRequest, ReturnRequestStatus } from "types";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
}

export function ReturnsPage() {
  const [status, setStatus] = useState<ReturnRequestStatus | "ALL">("ALL");
  const returnsQuery = useQuery({ queryKey: ["admin-returns", status], queryFn: () => adminApi.getReturns(status === "ALL" ? undefined : status) });
  const returns = returnsQuery.data ?? [];

  async function act(item: ReturnRequest, action: "approve" | "reject" | "refund" | "pickup" | "picked-up" | "inspect") {
    const note = window.prompt("Admin note", item.adminNote ?? "") ?? undefined;
    try {
      if (action === "approve") await adminApi.approveReturn(item.id, note);
      if (action === "reject") await adminApi.rejectReturn(item.id, note);
      if (action === "refund") await adminApi.refundReturn(item.id, note);
      if (action === "pickup") {
        const pickupScheduledAt = window.prompt("Pickup date/time (YYYY-MM-DDTHH:mm)", "") ?? undefined;
        const pickupAgent = window.prompt("Pickup agent", item.pickupAgent ?? "") ?? undefined;
        const pickupTrackingNumber = window.prompt("Pickup tracking number", item.pickupTrackingNumber ?? "") ?? undefined;
        await adminApi.scheduleReturnPickup(item.id, { note, pickupScheduledAt, pickupAgent, pickupTrackingNumber });
      }
      if (action === "picked-up") await adminApi.markReturnPickedUp(item.id, note);
      if (action === "inspect") await adminApi.inspectReturn(item.id, note);
      toast.success("Return updated");
      await returnsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to update return"));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reverse Logistics"
        title="Return Orchestration"
        description="Govern the return lifecycle. Process requests, coordinate pickups, perform quality inspections, and execute refund protocols."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Inbound Signals"
            value={String(returns.length)}
            meta="Total return requests"
            icon={<RotateCcw className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Awaiting Approval"
            value={String(returns.filter(r => r.status === "REQUESTED").length)}
            meta="New request protocols"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="In Transit"
            value={String(returns.filter(r => ["PICKUP_SCHEDULED", "PICKED_UP"].includes(r.status)).length)}
            meta="Active pickup nodes"
            icon={<CalendarClock className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Refund Pipeline"
            value={String(returns.filter(r => r.status === "REFUND_PENDING").length)}
            meta="Awaiting financial flush"
            icon={<WalletCards className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-[1.25rem] border-none bg-slate-50 py-4 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              placeholder="Filter returns via order node, customer identity, or reason…"
              // Logic for search can be added if needed, currently it filters by status select
            />
          </div>
          <select
            className="h-14 min-w-[240px] rounded-[1.25rem] border-none bg-slate-50 px-6 text-xs font-black uppercase tracking-[0.1em] text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white"
            value={status}
            onChange={(event) => setStatus(event.target.value as ReturnRequestStatus | "ALL")}
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="REQUESTED">Requested Protocol</option>
            <option value="APPROVED">Approval Granted</option>
            <option value="PICKUP_SCHEDULED">Pickup Synchronized</option>
            <option value="PICKED_UP">Custody Transferred</option>
            <option value="INSPECTED">Quality Verified</option>
            <option value="REFUND_PENDING">Refund Queued</option>
            <option value="REJECTED">Request Denied</option>
            <option value="REFUNDED">Capital Reconciled</option>
          </select>
        </div>
      </section>
      <DataTable
        data={returns}
        rowKey={(item) => item.id}
        emptyState="No return requests found."
        columns={[
          {
            key: "order",
            header: "Order",
            render: (item) => (
              <div>
                <div className="font-semibold text-slate-900">{item.orderNumber ?? `Order #${item.orderId}`}</div>
                <div className="text-xs text-slate-500">{item.customerName ?? `Customer #${item.userId}`}</div>
              </div>
            )
          },
          { key: "reason", header: "Reason", render: (item) => <span className="line-clamp-2 text-sm text-slate-600">{item.reason}</span> },
          { key: "status", header: "Status", render: (item) => <StatusBadge tone={item.status === "REFUNDED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>{item.status}</StatusBadge> },
          {
            key: "pickup",
            header: "Pickup",
            render: (item) => (
              <div className="text-xs text-slate-600">
                <div>{item.pickupScheduledAt ? formatDate(item.pickupScheduledAt) : "-"}</div>
                <div>{item.pickupAgent ?? item.pickupTrackingNumber ?? ""}</div>
              </div>
            )
          },
          { key: "created", header: "Requested", render: (item) => formatDate(item.createdAt) },
          {
            key: "actions",
            header: "Actions",
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => act(item, "approve")}>Approve</ActionButton>
                <ActionButton icon={<CalendarClock className="h-4 w-4" />} onClick={() => act(item, "pickup")}>Pickup</ActionButton>
                <ActionButton icon={<PackageCheck className="h-4 w-4" />} onClick={() => act(item, "picked-up")}>Picked up</ActionButton>
                <ActionButton icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => act(item, "inspect")}>Inspect</ActionButton>
                <ActionButton icon={<XCircle className="h-4 w-4" />} variant="danger" onClick={() => act(item, "reject")}>Reject</ActionButton>
                <ActionButton icon={<WalletCards className="h-4 w-4" />} onClick={() => act(item, "refund")}>Refund</ActionButton>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
