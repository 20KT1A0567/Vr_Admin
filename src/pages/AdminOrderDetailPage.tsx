import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataCard } from "components/admin/DataCard";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatusBadge } from "components/admin/StatusBadge";
import { Timeline } from "components/admin/Timeline";

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function formatLabel(value?: string) {
  if (!value) {
    return "-";
  }

  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const orderQuery = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => adminApi.getOrder(orderId),
    enabled: Number.isFinite(orderId)
  });

  async function downloadInvoice() {
    if (!orderQuery.data) {
      return;
    }

    try {
      const blob = await adminApi.downloadOrderInvoice(orderQuery.data.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${orderQuery.data.invoiceNumber}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to download invoice"));
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="admin-shell p-6">
        <SkeletonLoader lines={6} />
      </div>
    );
  }

  if (!orderQuery.data) {
    return <EmptyState title="Order not found" description="The requested order could not be loaded from the admin API." />;
  }

  const order = orderQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title={order.orderNumber}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatDateTime(order.createdAt)}</span>
            <StatusBadge tone={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>{formatLabel(order.status)}</StatusBadge>
            <StatusBadge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>{formatLabel(order.paymentStatus)}</StatusBadge>
          </span>
        }
        actions={
          <>
            <Link className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold" to="/orders">
              <ArrowLeft className="h-4 w-4" />
              Back to orders
            </Link>
            <ActionButton icon={<Download className="h-4 w-4" />} onClick={() => void downloadInvoice()}>
              Download invoice
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <DataCard title="Items" description="Products included in this order.">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="admin-shell-muted p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-950">{item.product.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Qty {item.quantity} · Unit {formatCurrency(item.priceAtTime)}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-950">{formatCurrency(item.priceAtTime * item.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard title="Order timeline" description="System and admin activity captured for this order.">
            <Timeline
              items={order.timeline.map((event) => ({
                title: event.title,
                description: (
                  <>
                    {event.description ? <span>{event.description}</span> : null}
                    {(event.actorName || event.actorEmail) ? (
                      <span className="mt-2 block text-xs text-slate-400">
                        By {event.actorName ?? event.actorEmail}
                        {event.source ? ` · ${formatLabel(event.source)}` : ""}
                      </span>
                    ) : null}
                  </>
                ),
                meta: formatDateTime(event.createdAt),
                tone:
                  event.eventType === "DELIVERED"
                    ? "success"
                    : event.eventType === "CANCELLED" || event.eventType === "PAYMENT_FAILED"
                      ? "danger"
                      : event.eventType === "PAYMENT_CAPTURED" || event.eventType === "CONFIRMED"
                        ? "info"
                        : "neutral"
              }))}
            />
          </DataCard>
        </div>

        <div className="space-y-5">
          <DataCard title="Summary" description="Commercial and fulfilment overview.">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Invoice</span>
                <span className="font-semibold text-slate-950">{order.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <StatusBadge tone={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>{formatLabel(order.status)}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment</span>
                <StatusBadge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>{formatLabel(order.paymentStatus)}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span>Method</span>
                <span className="font-semibold text-slate-950">{formatLabel(order.paymentMethod)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Store</span>
                <span className="font-semibold text-slate-950">{order.store?.name ?? "Not assigned"}</span>
              </div>
            </div>
          </DataCard>

          <DataCard title="Customer" description="Contact and delivery information.">
            <div className="space-y-3 text-sm text-slate-600">
              <div>{order.contactName}</div>
              <div>{order.contactPhone}</div>
              {order.contactEmail ? <div>{order.contactEmail}</div> : null}
              {order.deliveryAddress ? <div>{order.deliveryAddress}</div> : null}
              {order.notes ? <div className="admin-shell-muted p-3 text-slate-500">{order.notes}</div> : null}
              {order.cancellationReason ? <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">Cancellation reason: {order.cancellationReason}</div> : null}
              {order.returnReason ? <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">Return reason: {order.returnReason}</div> : null}
            </div>
          </DataCard>

          <DataCard title="Latest payment" description="Most recent payment transaction recorded for this order.">
            {order.latestPayment ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Gateway</span>
                  <span className="font-semibold text-slate-950">{formatLabel(order.latestPayment.gateway)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <StatusBadge tone={order.latestPayment.status === "CAPTURED" ? "success" : order.latestPayment.status === "FAILED" ? "danger" : "warning"}>{formatLabel(order.latestPayment.status)}</StatusBadge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Amount</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(order.latestPayment.amount)}</span>
                </div>
                {order.latestPayment.gatewayOrderId ? <div className="break-all text-xs text-slate-400">Gateway order ID: {order.latestPayment.gatewayOrderId}</div> : null}
                {order.latestPayment.gatewayPaymentId ? <div className="break-all text-xs text-slate-400">Gateway payment ID: {order.latestPayment.gatewayPaymentId}</div> : null}
                {order.latestPayment.failureReason ? <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">{order.latestPayment.failureReason}</div> : null}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No payment transaction has been recorded yet.</div>
            )}
          </DataCard>
        </div>
      </div>
    </div>
  );
}
