import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarClock, CheckCircle2, ClipboardCheck, PackageCheck, WalletCards, XCircle } from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataTable } from "components/admin/DataTable";
import { PageHeader } from "components/admin/PageHeader";
import { StatusBadge } from "components/admin/StatusBadge";
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
    <div className="space-y-5">
      <PageHeader eyebrow="Orders" title="Returns and refunds" description="Approve, reject, and mark refunds for customer return requests." />
      <div className="admin-card p-4">
        <select className="admin-select max-w-xs" value={status} onChange={(event) => setStatus(event.target.value as ReturnRequestStatus | "ALL")}>
          <option value="ALL">All returns</option>
          <option value="REQUESTED">Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="PICKUP_SCHEDULED">Pickup scheduled</option>
          <option value="PICKED_UP">Picked up</option>
          <option value="INSPECTED">Inspected</option>
          <option value="REFUND_PENDING">Refund pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>
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
