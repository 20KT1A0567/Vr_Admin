import { useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { StatCard } from "components/admin/StatCard";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Order Orchestration"
        title={order.orderNumber}
        description={`Synchronized node created on ${formatDateTime(order.createdAt)}. Monitor commercial flow, govern fulfillment logistics, and analyze audit telemetry.`}
        variant="premium"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white/50 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50 backdrop-blur-md dark:bg-slate-800/50 dark:text-white dark:hover:bg-slate-700/50" 
              to="/orders"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Ledger
            </Link>
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
              onClick={() => void downloadInvoice()}
            >
              <Download className="h-4 w-4" />
              Flush Invoice
            </button>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Node Magnitude"
            value={formatCurrency(order.totalAmount)}
            meta="Cumulative commercial value"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Protocol State"
            value={formatLabel(order.status)}
            meta="Current operational phase"
            icon={<Truck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Auth Registry"
            value={formatLabel(order.paymentStatus)}
            meta="Financial synchronization"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Ingress Source"
            value={formatLabel(order.paymentMethod)}
            meta="Commercial gateway node"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Inventory Nodes
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Included Artifacts</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Products and commercial entities governed by this order.</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50 p-8 dark:divide-white/5">
              {order.items.map((item) => (
                <div key={item.id} className="group flex flex-wrap items-center justify-between gap-6 py-6 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-slate-100 text-slate-400 dark:bg-white/5">
                      <Truck className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{item.product.title}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Qty {item.quantity} Node • Unit {formatCurrency(item.priceAtTime)} Magnitude
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{formatCurrency(item.priceAtTime * item.quantity)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Execution Trace
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Order Timeline</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Chronological telemetry of administrative and system events.</p>
              </div>
            </div>
            <div className="p-10">
              <Timeline
                items={order.timeline.map((event) => ({
                  title: event.title,
                  description: (
                    <>
                      {event.description ? <span className="text-sm font-medium text-slate-500">{event.description}</span> : null}
                      {(event.actorName || event.actorEmail) ? (
                        <span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                          By {event.actorName ?? event.actorEmail}
                          {event.source ? ` • Source: ${formatLabel(event.source)}` : ""}
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
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-white/5 dark:bg-white/2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 w-fit">
                Commercial Overview
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Order Summary</h2>
            </div>
            <div className="p-8 space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                <span>Invoice Registry</span>
                <span className="text-slate-900 dark:text-white">{order.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                <span>Node Magnitude</span>
                <span className="text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                <span>Protocol Status</span>
                <StatusBadge tone={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>{formatLabel(order.status)}</StatusBadge>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                <span>Auth State</span>
                <StatusBadge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>{formatLabel(order.paymentStatus)}</StatusBadge>
              </div>
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                <span>Ingress Method</span>
                <span className="text-slate-900 dark:text-white">{formatLabel(order.paymentMethod)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Store Affinity</span>
                <span className="text-slate-900 dark:text-white">{order.store?.name ?? "Not assigned"}</span>
              </div>
            </div>
          </section>

          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-white/5 dark:bg-white/2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 w-fit">
                Personnel Node
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Customer Profile</h2>
            </div>
            <div className="p-8 space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5">
                  <ArrowLeft className="h-5 w-5" />
                </div>
                <div>
                  <div>{order.contactName}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{order.contactPhone}</div>
                </div>
              </div>
              {order.contactEmail && (
                <div className="border-t border-slate-50 pt-4 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Email Registry</span>
                  <div className="text-slate-900 dark:text-white">{order.contactEmail}</div>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="border-t border-slate-50 pt-4 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Delivery Node</span>
                  <div className="text-slate-900 dark:text-white leading-relaxed">{order.deliveryAddress}</div>
                </div>
              )}
              {order.notes && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-medium text-slate-500 dark:bg-white/2 leading-relaxed">
                  {order.notes}
                </div>
              )}
              {order.cancellationReason && (
                <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-black uppercase tracking-widest text-rose-600 dark:bg-rose-500/10">
                  Revocation Protocol: {order.cancellationReason}
                </div>
              )}
            </div>
          </section>

          <ShipmentCard order={order} onEdit={() => setShipmentDialogOpen(true)} />

          <ShipmentDialog
            open={shipmentDialogOpen}
            order={order}
            saving={shipmentMutation.isPending}
            onClose={() => setShipmentDialogOpen(false)}
            onSave={(payload) => shipmentMutation.mutate(payload)}
          />

          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-white/5 dark:bg-white/2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 w-fit">
                Ingress Signal
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Transaction Node</h2>
            </div>
            <div className="p-8">
              {order.latestPayment ? (
                <div className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                    <span>Gateway Origin</span>
                    <span className="text-slate-900 dark:text-white">{formatLabel(order.latestPayment.gateway)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                    <span>Signal Status</span>
                    <StatusBadge tone={order.latestPayment.status === "CAPTURED" ? "success" : order.latestPayment.status === "FAILED" ? "danger" : "warning"}>{formatLabel(order.latestPayment.status)}</StatusBadge>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
                    <span>Captured Magnitude</span>
                    <span className="text-slate-900 dark:text-white">{formatCurrency(order.latestPayment.amount)}</span>
                  </div>
                  {order.latestPayment.gatewayOrderId && (
                    <div className="pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gateway Order Node</span>
                      <div className="font-mono text-[10px] break-all">{order.latestPayment.gatewayOrderId}</div>
                    </div>
                  )}
                  {order.latestPayment.gatewayPaymentId && (
                    <div className="pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gateway Payment Trace</span>
                      <div className="font-mono text-[10px] break-all">{order.latestPayment.gatewayPaymentId}</div>
                    </div>
                  )}
                  {order.latestPayment.failureReason && (
                    <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-black uppercase tracking-widest text-rose-600 dark:bg-rose-500/10">
                      Processing Fault: {order.latestPayment.failureReason}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 text-center py-4">
                  No ingress transactional nodes detected.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ShipmentCard({ order, onEdit }: { order: Order; onEdit: () => void }) {
  const hasShipment = !!(order.courierName || order.trackingNumber || order.trackingUrl || order.shippedAt);

  return (
    <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
      <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-white/5 dark:bg-white/2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 w-fit">
            Logistics Protocol
          </div>
          <button 
            type="button" 
            className="text-[10px] font-black uppercase tracking-widest text-slate-900 underline underline-offset-4 dark:text-white"
            onClick={onEdit}
          >
            {hasShipment ? "Update" : "Add Trace"}
          </button>
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Shipment Tracking</h2>
      </div>
      <div className="p-8">
        {!hasShipment ? (
          <div className="text-sm font-bold text-slate-400 text-center py-4 leading-relaxed">
            No logistics nodes captured yet. Initialize tracking once dispatched.
          </div>
        ) : (
          <div className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
              <span>Courier Protocol</span>
              <span className="text-slate-900 dark:text-white">{order.courierName ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-white/5">
              <span>AWB / Trace ID</span>
              <span className="font-mono text-slate-900 dark:text-white">{order.trackingNumber ?? "-"}</span>
            </div>
            {order.trackingUrl && (
              <div className="border-b border-slate-50 pb-4 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Real-time Trace Node</span>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline break-all"
                >
                  <ExternalLink className="h-3 w-3" />
                  {order.trackingUrl}
                </a>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Shipped Phase</span>
                <div className="text-slate-900 dark:text-white">{order.shippedAt ? formatDateTime(order.shippedAt) : "-"}</div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Delivered Phase</span>
                <div className="text-slate-900 dark:text-white">{order.deliveredAt ? formatDateTime(order.deliveredAt) : "-"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
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
