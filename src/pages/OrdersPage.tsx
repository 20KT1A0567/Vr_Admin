import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  MapPin,
  PackageCheck,
  Phone,
  Search,
  ShoppingBag,
  Truck
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import { Tabs } from "components/admin/Tabs";
import type { Order, OrderStatus, PaymentStatus } from "types";

const orderStatusOptions: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "READY",
  "DELIVERED",
  "RETURN_REQUESTED",
  "REFUNDED",
  "CANCELLED"
];
const paymentStatusOptions: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];
const statusTabValues = ["ALL", "PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const activeStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "READY"];
type PeriodKey = "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";

const periodTabs: Array<{ key: PeriodKey; label: string }> = [
  { key: "TODAY", label: "Today" },
  { key: "WEEK", label: "Week" },
  { key: "MONTH", label: "Month" },
  { key: "ALL_TIME", label: "All Time" }
];

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPeriodStart(period: PeriodKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "TODAY") {
    return today.getTime();
  }
  if (period === "WEEK") {
    const day = today.getDay() || 7;
    today.setDate(today.getDate() - day + 1);
    return today.getTime();
  }
  if (period === "MONTH") {
    today.setDate(1);
    return today.getTime();
  }
  return null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function orderTone(status: OrderStatus) {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED" || status === "RETURN_REQUESTED" || status === "REFUNDED") return "danger";
  if (status === "CONFIRMED" || status === "PACKED" || status === "SHIPPED" || status === "READY") return "info";
  return "warning";
}

function paymentTone(status: PaymentStatus) {
  if (status === "PAID") return "success";
  if (status === "FAILED") return "danger";
  if (status === "REFUNDED") return "neutral";
  return "warning";
}

function nextOrderStep(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Confirm order";
    case "CONFIRMED":
      return "Pack order";
    case "PACKED":
      return "Ship order";
    case "SHIPPED":
    case "READY":
      return "Mark delivered";
    case "RETURN_REQUESTED":
      return "Review return";
    case "DELIVERED":
      return "Completed";
    case "REFUNDED":
      return "Refunded";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Review order";
  }
}

export function OrdersPage() {
  const { data: orders = [], isLoading, refetch } = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.getOrders });
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<(typeof statusTabValues)[number]>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>("MONTH");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const stores = useMemo(() => {
    const uniqueStores = new Map<number, string>();
    orders.forEach((order) => {
      if (order.store?.id) {
        uniqueStores.set(order.store.id, order.store.name);
      }
    });
    return Array.from(uniqueStores.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchMatch = `${order.orderNumber} ${order.invoiceNumber} ${order.contactName} ${order.contactPhone} ${order.contactEmail ?? ""} ${order.store?.name ?? ""} ${order.id}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusTabMatch = statusTab === "ALL" ? true : order.status === statusTab;
      const statusMatch = statusFilter === "ALL" ? true : order.status === statusFilter;
      const paymentMatch = paymentFilter === "ALL" ? true : order.paymentStatus === paymentFilter;
      const storeMatch = storeFilter === "ALL" ? true : String(order.store?.id ?? "") === storeFilter;
      const orderTime = Date.parse(order.createdAt);
      const periodStart = getPeriodStart(periodFilter);
      const periodMatch = periodStart == null || Number.isNaN(orderTime) ? true : orderTime >= periodStart;
      const fromMatch = !dateFrom || Number.isNaN(orderTime) ? true : orderTime >= Date.parse(`${dateFrom}T00:00:00`);
      const toMatch = !dateTo || Number.isNaN(orderTime) ? true : orderTime <= Date.parse(`${dateTo}T23:59:59`);

      return searchMatch && statusTabMatch && statusMatch && paymentMatch && storeMatch && periodMatch && fromMatch && toMatch;
    });
  }, [dateFrom, dateTo, orders, paymentFilter, periodFilter, search, statusFilter, statusTab, storeFilter]);

  useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrderId(null);
      return;
    }
    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) ?? null;
  const filteredRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const pendingCount = filteredOrders.filter((order) => activeStatuses.includes(order.status)).length;
  const deliveredCount = filteredOrders.filter((order) => order.status === "DELIVERED").length;
  const paidCount = filteredOrders.filter((order) => order.paymentStatus === "PAID").length;
  const failedPaymentCount = filteredOrders.filter((order) => order.paymentStatus === "FAILED").length;
  const averageOrder = filteredOrders.length ? filteredRevenue / filteredOrders.length : 0;

  async function updateStatus(orderId: number, value: string, type: "status" | "payment") {
    const key = `${orderId}-${type}`;
    setUpdatingKey(key);
    try {
      if (type === "status") {
        await adminApi.updateOrderStatus(orderId, value);
      } else {
        await adminApi.updatePaymentStatus(orderId, value);
      }
      toast.success("Order updated");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update order"));
    } finally {
      setUpdatingKey(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusTab("ALL");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setStoreFilter("ALL");
    setPeriodFilter("ALL_TIME");
    setDateFrom("");
    setDateTo("");
  }

  function applyPeriodFilter(period: PeriodKey) {
    setPeriodFilter(period);
    setDateFrom("");
    setDateTo("");
  }

  async function handleExportOrders() {
    try {
      downloadBlob(await adminApi.exportOrders(), "orders.csv");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export orders"));
    }
  }

  if (isLoading && !orders.length) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Commerce" title="Order desk" description="Loading live orders, payment state, and fulfilment data." />
        <div className="admin-shell p-6">
          <SkeletonLoader lines={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title="Order desk"
        description="Search, triage, update, and complete orders from one operations workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold" onClick={handleExportOrders}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <Link className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Orders"
            value={String(filteredOrders.length)}
            meta={`${orders.length} total orders`}
            icon={<ShoppingBag className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="Action Queue"
            value={String(pendingCount)}
            meta="Need fulfilment updates"
            icon={<Clock3 className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend={pendingCount > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Paid Orders"
            value={String(paidCount)}
            meta={failedPaymentCount ? `${failedPaymentCount} failed payments` : `${deliveredCount} delivered`}
            icon={<CreditCard className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend={failedPaymentCount ? "down" : "up"}
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(filteredRevenue)}
            meta={`${formatCurrency(averageOrder)} average order`}
            icon={<CircleDollarSign className="h-5 w-5" />}
            accentClassName="bg-violet-50 text-violet-700"
            trend="up"
          />
        </div>
      </PageHeader>

      <FilterBar
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              {filteredOrders.length} orders match filters, worth {formatCurrency(filteredRevenue)}
            </span>
            <button type="button" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            items={statusTabValues.map((value) => ({
              value,
              label: value === "ALL" ? "All" : formatStatus(value),
              badge: value === "ALL" ? orders.length : orders.filter((order) => order.status === value).length
            }))}
            value={statusTab}
            onChange={setStatusTab}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
            {stores.length} stores contributing orders
          </div>
        </div>

        <div className="inline-flex w-fit overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {periodTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                periodFilter === tab.key ? "bg-[#1E63F2] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
              }`}
              onClick={() => applyPeriodFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))]">
          <SearchInput placeholder="Search order, customer, phone, or invoice" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {orderStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
          <select className="admin-select" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="ALL">All payments</option>
            {paymentStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
          <select className="admin-select" value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}>
            <option value="ALL">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <input className="admin-input" type="date" value={dateFrom} onChange={(event) => {
            setPeriodFilter("ALL_TIME");
            setDateFrom(event.target.value);
          }} />
          <input className="admin-input" type="date" value={dateTo} onChange={(event) => {
            setPeriodFilter("ALL_TIME");
            setDateTo(event.target.value);
          }} />
        </div>
      </FilterBar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="admin-shell overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Order queue</h2>
              <p className="mt-1 text-sm text-slate-500">Select an order to update status, payment, and fulfilment.</p>
            </div>
            <div className="admin-badge-slate">{filteredOrders.length} shown</div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Search className="h-6 w-6" />
              </div>
              <div className="mt-4 text-lg font-semibold text-slate-900">No orders found</div>
              <p className="mt-1 max-w-md text-sm text-slate-500">Adjust filters or clear them to view the full order queue.</p>
              <button type="button" className="admin-button-secondary mt-5" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const selected = selectedOrderId === order.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`block w-full px-5 py-4 text-left transition ${
                      selected ? "bg-blue-50/80" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.7fr_0.8fr] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">{order.orderNumber}</span>
                          <StatusBadge tone={orderTone(order.status)}>{formatStatus(order.status)}</StatusBadge>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{order.contactName}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          {order.contactPhone}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</div>
                        <div className="mt-1">
                          <StatusBadge tone={paymentTone(order.paymentStatus)}>{formatStatus(order.paymentStatus)}</StatusBadge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {order.items.length} item(s)
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {nextOrderStep(order.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="admin-shell overflow-hidden p-0 xl:sticky xl:top-24 xl:self-start">
          {!selectedOrder ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
              Select an order to see operations details.
            </div>
          ) : (
            <OrderOperationsPanel
              order={selectedOrder}
              updatingKey={updatingKey}
              onUpdateStatus={(value) => void updateStatus(selectedOrder.id, value, "status")}
              onUpdatePayment={(value) => void updateStatus(selectedOrder.id, value, "payment")}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

interface OrderOperationsPanelProps {
  order: Order;
  updatingKey: string | null;
  onUpdateStatus: (value: OrderStatus) => void;
  onUpdatePayment: (value: PaymentStatus) => void;
}

function OrderOperationsPanel({ order, updatingKey, onUpdateStatus, onUpdatePayment }: OrderOperationsPanelProps) {
  const statusUpdating = updatingKey === `${order.id}-status`;
  const paymentUpdating = updatingKey === `${order.id}-payment`;

  return (
    <div>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="admin-display text-xl font-semibold text-slate-950">{order.orderNumber}</div>
            <div className="mt-1 text-sm text-slate-500">{formatDate(order.createdAt)} . Invoice {order.invoiceNumber}</div>
          </div>
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          >
            Full
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="admin-shell-muted p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Truck className="h-4 w-4" />
              Fulfilment
            </div>
            <div className="mt-3">
              <StatusBadge tone={orderTone(order.status)}>{formatStatus(order.status)}</StatusBadge>
            </div>
            <select className="admin-select mt-3" value={order.status} disabled={statusUpdating} onChange={(event) => onUpdateStatus(event.target.value as OrderStatus)}>
              {orderStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-shell-muted p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <CreditCard className="h-4 w-4" />
              Payment
            </div>
            <div className="mt-3">
              <StatusBadge tone={paymentTone(order.paymentStatus)}>{formatStatus(order.paymentStatus)}</StatusBadge>
            </div>
            <select className="admin-select mt-3" value={order.paymentStatus} disabled={paymentUpdating} onChange={(event) => onUpdatePayment(event.target.value as PaymentStatus)}>
              {paymentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Customer</div>
              <div className="mt-1 font-semibold text-slate-950">{order.contactName}</div>
            </div>
            <a className="admin-button-secondary !min-h-0 !px-3 !py-2 text-xs" href={`tel:${order.contactPhone}`}>
              Call
            </a>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {order.contactPhone}
            </div>
            {order.contactEmail ? <div>{order.contactEmail}</div> : null}
            {order.deliveryAddress ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{order.deliveryAddress}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Items</div>
            <span className="admin-badge-slate">{order.items.length} item(s)</span>
          </div>
          <div className="space-y-3">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-900">{item.product.title}</div>
                  <div className="text-xs text-slate-500">
                    Qty {item.quantity} x {formatCurrency(item.priceAtTime)}
                  </div>
                </div>
                <div className="font-semibold text-slate-950">{formatCurrency(item.quantity * item.priceAtTime)}</div>
              </div>
            ))}
            {order.items.length > 3 ? <div className="text-xs text-slate-500">+ {order.items.length - 3} more item(s)</div> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Store</span>
            <span className="font-semibold text-slate-950">{order.store?.name ?? "Not assigned"}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>Total</span>
            <span className="admin-display text-2xl font-semibold text-slate-950">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>Next step</span>
            <span className="font-semibold text-slate-950">{nextOrderStep(order.status)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
