import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleDollarSign, Clock3, PackageCheck, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { DataTable } from "components/admin/DataTable";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import { Tabs } from "components/admin/Tabs";

const orderStatusOptions = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "READY", "DELIVERED", "RETURN_REQUESTED", "REFUNDED", "CANCELLED"] as const;
const paymentStatusOptions = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
const statusTabValues = ["ALL", "PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function OrdersPage() {
  const { data: orders = [], isLoading, refetch } = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.getOrders });
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<(typeof statusTabValues)[number]>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      const searchMatch = `${order.orderNumber} ${order.contactName} ${order.contactPhone} ${order.store?.name ?? ""} ${order.id}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusTabMatch = statusTab === "ALL" ? true : order.status === statusTab;
      const statusMatch = statusFilter === "ALL" ? true : order.status === statusFilter;
      const paymentMatch = paymentFilter === "ALL" ? true : order.paymentStatus === paymentFilter;
      const storeMatch = storeFilter === "ALL" ? true : String(order.store?.id ?? "") === storeFilter;
      const orderTime = Date.parse(order.createdAt);
      const fromMatch = !dateFrom || Number.isNaN(orderTime) ? true : orderTime >= Date.parse(`${dateFrom}T00:00:00`);
      const toMatch = !dateTo || Number.isNaN(orderTime) ? true : orderTime <= Date.parse(`${dateTo}T23:59:59`);

      return searchMatch && statusTabMatch && statusMatch && paymentMatch && storeMatch && fromMatch && toMatch;
    });
  }, [dateFrom, dateTo, orders, paymentFilter, search, statusFilter, statusTab, storeFilter]);

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const pendingCount = orders.filter((order) => ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "READY"].includes(order.status)).length;
  const confirmedCount = orders.filter((order) => order.status === "CONFIRMED").length;
  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;

  async function updateStatus(orderId: number, value: string, type: "status" | "payment") {
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
    }
  }

  if (isLoading && !orders.length) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Commerce"
          title="Order desk"
          description="Loading live orders, payment state, and fulfilment data."
        />
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
        description="A premium operations workspace for search, status updates, payment tracking, and quick escalation."
        actions={
          <Link className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold" to="/dashboard">
            Back to dashboard
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Orders"
            value={String(orders.length)}
            meta={`${filteredOrders.length} in view`}
            icon={<ShoppingBag className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="Pending"
            value={String(pendingCount)}
            meta="Awaiting action"
            icon={<Clock3 className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend={pendingCount > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Confirmed"
            value={String(confirmedCount)}
            meta="Ready for next step"
            icon={<PackageCheck className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend="up"
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(totalRevenue)}
            meta={`${deliveredCount} delivered`}
            icon={<CircleDollarSign className="h-5 w-5" />}
            accentClassName="bg-violet-50 text-violet-700"
            trend="up"
          />
        </div>
      </PageHeader>

      <FilterBar
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>{filteredOrders.length} orders match the current filters</span>
            <button
              type="button"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              onClick={() => {
                setSearch("");
                setStatusTab("ALL");
                setStatusFilter("ALL");
                setPaymentFilter("ALL");
                setStoreFilter("ALL");
                setDateFrom("");
                setDateTo("");
              }}
            >
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <SearchInput
            placeholder="Search order, customer, phone, or store"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
          <input className="admin-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className="admin-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </FilterBar>

      <DataTable
        data={filteredOrders}
        rowKey={(order) => order.id}
        emptyState="No orders match the current filter set."
        columns={[
          {
            key: "order",
            header: "Order",
            render: (order) => (
              <div>
                <div className="font-semibold text-slate-900">{order.orderNumber}</div>
                <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
              </div>
            )
          },
          {
            key: "customer",
            header: "Customer",
            render: (order) => (
              <div>
                <div className="font-medium text-slate-900">{order.contactName}</div>
                <div className="text-xs text-slate-400">{order.contactPhone}</div>
              </div>
            )
          },
          {
            key: "store",
            header: "Store",
            render: (order) => <span className="text-slate-600">{order.store?.name ?? "Not assigned"}</span>
          },
          {
            key: "items",
            header: "Items",
            render: (order) => <span className="text-slate-600">{order.items.length} item(s)</span>
          },
          {
            key: "amount",
            header: "Amount",
            render: (order) => <span className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span>
          },
          {
            key: "status",
            header: "Status",
            render: (order) => (
              <select className="admin-select min-w-[170px]" value={order.status} onChange={(event) => void updateStatus(order.id, event.target.value, "status")}>
                {orderStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatStatus(option)}
                  </option>
                ))}
              </select>
            )
          },
          {
            key: "payment",
            header: "Payment",
            render: (order) => (
              <div className="space-y-2">
                <StatusBadge
                  tone={
                    order.paymentStatus === "PAID"
                      ? "success"
                      : order.paymentStatus === "FAILED"
                        ? "danger"
                        : order.paymentStatus === "REFUNDED"
                          ? "neutral"
                          : "warning"
                  }
                >
                  {formatStatus(order.paymentStatus)}
                </StatusBadge>
                <select className="admin-select min-w-[160px]" value={order.paymentStatus} onChange={(event) => void updateStatus(order.id, event.target.value, "payment")}>
                  {paymentStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
              </div>
            )
          },
          {
            key: "actions",
            header: "Action",
            cellClassName: "text-right",
            headerClassName: "text-right",
            render: (order) => (
              <Link
                to={`/orders/${order.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              >
                Open
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )
          }
        ]}
      />
    </div>
  );
}
