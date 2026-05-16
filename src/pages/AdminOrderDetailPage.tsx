import { useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { DataCard } from "components/admin/DataCard";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatusBadge } from "components/admin/StatusBadge";
import { Timeline } from "components/admin/Timeline";
import type { Order, ShipmentUpdatePayload } from "types";

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
  const queryClient = useQueryClient();
  const orderQuery = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => adminApi.getOrder(orderId),
    enabled: Number.isFinite(orderId)
  });
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);

  const shipmentMutation = useMutation({
    mutationFn: (payload: ShipmentUpdatePayload) => adminApi.updateShipment(orderId, payload),
    onSuccess: () => {
      toast.success("Shipment updated");
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      setShipmentDialogOpen(false);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update shipment"))
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

          <ShipmentCard order={order} onEdit={() => setShipmentDialogOpen(true)} />

          <ShipmentDialog
            open={shipmentDialogOpen}
            order={order}
            saving={shipmentMutation.isPending}
            onClose={() => setShipmentDialogOpen(false)}
            onSave={(payload) => shipmentMutation.mutate(payload)}
          />

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

function ShipmentCard({ order, onEdit }: { order: Order; onEdit: () => void }) {
  const hasShipment = !!(order.courierName || order.trackingNumber || order.trackingUrl || order.shippedAt);

  return (
    <DataCard
      title="Shipment & tracking"
      description="Courier, AWB, and delivery timestamps shown to the customer."
      action={
        <ActionButton variant="secondary" icon={<Truck className="h-4 w-4" />} onClick={onEdit}>
          {hasShipment ? "Update shipment" : "Add tracking"}
        </ActionButton>
      }
    >
      {!hasShipment ? (
        <div className="text-sm text-slate-500">
          No tracking details captured yet. Add a courier, AWB, and tracking URL once the order is dispatched.
        </div>
      ) : (
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>Courier</span>
            <span className="font-semibold text-slate-950">{order.courierName ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>AWB / Tracking ID</span>
            <span className="font-mono font-semibold text-slate-950">{order.trackingNumber ?? "-"}</span>
          </div>
          {order.trackingUrl ? (
            <div className="flex items-center justify-between gap-3">
              <span>Tracking URL</span>
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[60%] items-center gap-1 truncate text-[#1E63F2] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.trackingUrl}</span>
              </a>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Shipped at</span>
            <span className="text-slate-700">{order.shippedAt ? formatDateTime(order.shippedAt) : "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Delivered at</span>
            <span className="text-slate-700">{order.deliveredAt ? formatDateTime(order.deliveredAt) : "-"}</span>
          </div>
        </div>
      )}
    </DataCard>
  );
}

function ShipmentDialog({
  open,
  order,
  saving,
  onClose,
  onSave
}: {
  open: boolean;
  order: Order;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ShipmentUpdatePayload) => void;
}) {
  const [courier, setCourier] = useState(order.courierName ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [url, setUrl] = useState(order.trackingUrl ?? "");
  const [markShipped, setMarkShipped] = useState(false);

  const alreadyShipped = order.status === "SHIPPED" || order.status === "DELIVERED";
  const blockedFromShipping = alreadyShipped || order.status === "CANCELLED" || order.status === "REFUNDED";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      courierName: courier.trim() || null,
      trackingNumber: tracking.trim() || null,
      trackingUrl: url.trim() || null,
      markShipped: markShipped && !blockedFromShipping
    });
  }

  function handleClear() {
    onSave({ clear: true });
  }

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { className: "!bg-slate-950/60 backdrop-blur-md" },
        paper: { className: "admin-dialog-surface admin-fade-in !m-4" }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent className="!px-6 !py-6 sm:!px-7">
          <div className="admin-pill border-indigo-300/45 bg-indigo-500/10 text-indigo-500">Shipment & tracking</div>
          <h3 className="mt-4 text-[1.35rem] font-extrabold text-[color:var(--color-text)]">
            {order.courierName || order.trackingNumber ? "Update shipment details" : "Add tracking details"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--color-text-subtle)]">
            These details are shown to the customer on their order page and emails.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">Courier</div>
              <input
                className="admin-input"
                placeholder="Delhivery, Bluedart, DTDC..."
                value={courier}
                onChange={(event) => setCourier(event.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">AWB / Tracking number</div>
              <input
                className="admin-input font-mono"
                placeholder="XXXXX-XXXX"
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">Tracking URL</div>
              <input
                className="admin-input"
                placeholder="https://..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                maxLength={500}
                type="url"
              />
            </label>
            <label
              className={`flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-3 ${
                blockedFromShipping ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={markShipped}
                onChange={(event) => setMarkShipped(event.target.checked)}
                disabled={blockedFromShipping}
                className="h-4 w-4"
              />
              <span className="text-sm">
                Mark this order as <span className="font-semibold">shipped</span> now and stamp the timestamp.
                {alreadyShipped ? (
                  <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                    (already {order.status.toLowerCase()})
                  </span>
                ) : null}
              </span>
            </label>
          </div>
        </DialogContent>
        <DialogActions className="admin-dialog-footer flex flex-wrap justify-between gap-3">
          <ActionButton
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={saving || (!order.courierName && !order.trackingNumber && !order.trackingUrl && !order.shippedAt)}
          >
            Clear all
          </ActionButton>
          <div className="flex gap-3">
            <ActionButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" loading={saving}>
              Save shipment
            </ActionButton>
          </div>
        </DialogActions>
      </form>
    </Dialog>
  );
}
