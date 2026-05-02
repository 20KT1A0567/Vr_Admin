import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  CircleDollarSign,
  Image as ImageIcon,
  PackagePlus,
  PackageSearch,
  ShoppingBag,
  Store as StoreIcon,
  TrendingUp,
  Users,
  XCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi } from "api/client";
import { DataCard } from "components/admin/DataCard";
import { EmptyState } from "components/admin/EmptyState";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatusBadge } from "components/admin/StatusBadge";
import { cn } from "utils/cn";

type DashboardRange = "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";

interface DashboardMetricTileProps {
  accentClassName: string;
  borderClassName: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  value: string;
  trend?: "up" | "flat";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatStatus(status: string) {
  return status.split("_").join(" ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isSameDay(value: string, reference: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function isSameMonth(value: string, reference: Date) {
  const date = new Date(value);
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function DashboardMetricTile({
  accentClassName,
  borderClassName,
  icon: Icon,
  label,
  meta,
  value,
  trend = "flat"
}: DashboardMetricTileProps) {
  return (
    <article className={cn("admin-dashboard-metric border min-h-[164px]", borderClassName)}>
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", accentClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {trend === "up" ? "Trending" : "Stable"}
          </span>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
          <div className="mt-4 text-[2rem] font-bold tracking-[-0.06em] text-slate-950">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{meta}</div>
        </div>
      </div>
    </article>
  );
}

function MiniSparkline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 36" className="mt-5 h-8 w-full" fill="none" aria-hidden>
      <path
        d="M2 28C20 24 34 18 49 13C62 9 78 11 94 9C112 7 126 11 142 10C148 10 154 10 158 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const chartColors = ["#14b8a6", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];

export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("TODAY");
  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminApi.getDashboard });
  const bannersQuery = useQuery({ queryKey: ["admin-banners"], queryFn: adminApi.getBanners });

  const data = dashboardQuery.data;
  const banners = bannersQuery.data ?? [];
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now);

  const deliveredCount = data?.orderStatuses.find((item) => item.status === "DELIVERED")?.count ?? 0;
  const cancelledCount = data?.orderStatuses.find((item) => item.status === "CANCELLED")?.count ?? 0;
  const avgOrderValue = data?.totalOrders ? data.totalRevenue / data.totalOrders : 0;

  const todayOrders = useMemo(
    () => (data?.recentOrders ?? []).filter((order) => isSameDay(order.createdAt, now)),
    [data?.recentOrders, now]
  );
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.amount, 0);
  const monthRevenue = useMemo(
    () => (data?.recentOrders ?? []).filter((order) => isSameMonth(order.createdAt, now)).reduce((sum, order) => sum + order.amount, 0),
    [data?.recentOrders, now]
  );
  const activeBanners = banners.filter((banner) => banner.active).length;

  const statusChartBackground = useMemo(() => {
    if (!data?.orderStatuses.length) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }

    let start = 0;
    const segments = data.orderStatuses.map((item, index) => {
      const end = start + Math.max(item.percentage, 2) * 3.6;
      const segment = `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
      start = end;
      return segment;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [data]);

  const orderTrend = useMemo(() => {
    if (!data?.recentOrders.length) {
      return [];
    }

    const grouped = new Map<string, number>();
    data.recentOrders
      .slice()
      .reverse()
      .forEach((order) => {
        const label = formatShortDate(order.createdAt);
        grouped.set(label, (grouped.get(label) ?? 0) + order.amount);
      });

    return Array.from(grouped.entries()).slice(-7);
  }, [data]);

  const maxTrendValue = Math.max(...orderTrend.map(([, amount]) => amount), 1);

  const rangeSubtitle =
    range === "TODAY"
      ? "Live operational overview"
      : range === "WEEK"
        ? "Weekly operations snapshot"
        : range === "MONTH"
          ? "Monthly admin performance"
          : "All-time business summary";

  if (dashboardQuery.isLoading && !data) {
    return (
      <div className="space-y-5">
        <section className="admin-dashboard-hero px-6 py-6">
          <SkeletonLoader className="h-8 w-56" />
          <SkeletonLoader className="mt-3 h-5 w-72" />
        </section>
        <div className="grid gap-4 xl:grid-cols-[1.55fr_repeat(4,minmax(0,1fr))]">
          <div className="admin-shell p-6">
            <SkeletonLoader lines={6} />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="admin-shell p-5">
              <SkeletonLoader lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Dashboard data is unavailable"
        description="The dashboard API did not return any metrics. Check the backend connection and refresh."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="admin-dashboard-hero overflow-hidden px-6 py-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="admin-display admin-dashboard-hero-title text-[2.2rem] font-bold leading-none sm:text-[2.65rem]">
              Admin Dashboard
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {todayLabel} - {rangeSubtitle}
            </p>
          </div>

          <div className="admin-dashboard-range self-start lg:self-auto">
            {[
              { key: "TODAY", label: "Today" },
              { key: "WEEK", label: "Week" },
              { key: "MONTH", label: "Month" },
              { key: "ALL_TIME", label: "All Time" }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={cn(
                  "admin-dashboard-range-option",
                  range === item.key ? "admin-dashboard-range-option-active" : undefined
                )}
                onClick={() => setRange(item.key as DashboardRange)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_repeat(4,minmax(0,1fr))]">
        <section className="admin-dashboard-spotlight">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Good afternoon admin</div>
          <h2 className="mt-4 text-[2rem] font-bold tracking-[-0.05em] text-slate-950">Marketplace pulse</h2>
          <p className="mt-3 max-w-xl text-base leading-8 text-slate-600">
            Orders, income, delivery status, and customer activity in one live view.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-500 px-3 py-2 text-xs font-semibold text-white">
              {todayOrders.length} orders
            </span>
            <span className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">
              {formatCurrency(todayRevenue)} income
            </span>
            <span className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
              {deliveredCount} delivered
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/orders" className="admin-button rounded-full px-5 py-3">
              View Orders
            </Link>
            <Link to="/products" className="admin-button-secondary rounded-full px-5 py-3">
              Open Catalog
            </Link>
          </div>
        </section>

        <DashboardMetricTile
          accentClassName="bg-orange-50 text-orange-600"
          borderClassName="border-orange-200/80"
          icon={CircleDollarSign}
          label="Sales"
          meta={range === "TODAY" ? "Today" : "Revenue tracked"}
          value={formatCurrency(data.totalRevenue)}
          trend="up"
        />
        <DashboardMetricTile
          accentClassName="bg-cyan-50 text-cyan-600"
          borderClassName="border-cyan-200/80"
          icon={ShoppingBag}
          label="Orders"
          meta={`${deliveredCount} delivered`}
          value={String(data.totalOrders)}
        />
        <DashboardMetricTile
          accentClassName="bg-violet-50 text-violet-600"
          borderClassName="border-violet-200/80"
          icon={TrendingUp}
          label="Avg Order"
          meta="Income per order"
          value={formatCurrency(avgOrderValue)}
          trend="up"
        />
        <article className="admin-dashboard-metric min-h-[164px] border border-emerald-200/80">
          <div className="flex h-full flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Customers</span>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Customers</div>
              <div className="mt-4 text-[2rem] font-bold tracking-[-0.06em] text-slate-950">{data.totalUsers}</div>
              <div className="mt-2 text-sm text-slate-500">{data.newEnquiries} new today</div>
              <MiniSparkline color="#10b981" />
            </div>
          </div>
        </article>
      </div>

      <section>
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Orders - Today</div>
        <div className="grid gap-4 xl:grid-cols-4">
          <DashboardMetricTile
            accentClassName="bg-indigo-50 text-indigo-600"
            borderClassName="border-indigo-200/80"
            icon={ShoppingBag}
            label="Orders"
            meta="Today"
            value={String(todayOrders.length)}
          />
          <DashboardMetricTile
            accentClassName="bg-emerald-50 text-emerald-600"
            borderClassName="border-emerald-200/80"
            icon={CheckCircle2}
            label="Delivered"
            meta="Today"
            value={String(deliveredCount)}
            trend="up"
          />
          <DashboardMetricTile
            accentClassName="bg-rose-50 text-rose-600"
            borderClassName="border-rose-200/80"
            icon={XCircle}
            label="Cancelled"
            meta="Today"
            value={String(cancelledCount)}
          />
          <article className="admin-dashboard-strip border border-violet-200/80">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <StatusBadge tone="violet">All time</StatusBadge>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Orders</div>
                <div className="mt-4 text-[2rem] font-bold tracking-[-0.06em] text-violet-500">{data.totalOrders}</div>
                <div className="mt-2 text-sm text-slate-500">Complete order book</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Income - Today</div>
        <div className="grid gap-4 xl:grid-cols-4">
          <DashboardMetricTile
            accentClassName="bg-amber-50 text-amber-600"
            borderClassName="border-amber-200/80"
            icon={CircleDollarSign}
            label="Today Income"
            meta="Today's checkout total"
            value={formatCurrency(todayRevenue)}
            trend="up"
          />
          <DashboardMetricTile
            accentClassName="bg-emerald-50 text-emerald-600"
            borderClassName="border-emerald-200/80"
            icon={StoreIcon}
            label="Active Stores"
            meta={`${data.activeStores}/${data.totalStores} operating`}
            value={String(data.activeStores)}
          />
          <DashboardMetricTile
            accentClassName="bg-blue-50 text-blue-600"
            borderClassName="border-blue-200/80"
            icon={TrendingUp}
            label="This Month"
            meta="Recent month tracked"
            value={formatCurrency(monthRevenue)}
            trend="up"
          />
          <article className="admin-dashboard-strip border border-indigo-200/80">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <StatusBadge tone="info">Total income</StatusBadge>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Total Income</div>
                <div className="mt-4 text-[2rem] font-bold tracking-[-0.06em] text-indigo-500">{formatCurrency(data.totalRevenue)}</div>
                <div className="mt-2 text-sm text-slate-500">{data.pendingOrders} pending orders in queue</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
        <DataCard title="Command center" description="Jump into the highest-frequency admin workflows from one action shelf.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: "/products", label: "Add product", icon: PackagePlus, body: "Create a new listing and assign stores." },
              { to: "/banners", label: "Create banner", icon: ImageIcon, body: "Launch desktop or mobile campaigns." },
              { to: "/orders", label: "Manage orders", icon: ShoppingBag, body: "Review status changes and payments." },
              { to: "/coupons", label: "Create coupon", icon: BadgePercent, body: "Publish a discount campaign." }
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="rounded-[24px] border border-slate-200/85 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-950">{action.label}</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{action.body}</p>
              </Link>
            ))}
          </div>
        </DataCard>

        <DataCard title="Revenue trend" description="Recent order value movement across the last few order-active days.">
          {orderTrend.length ? (
            <div className="flex h-60 items-end gap-3">
              {orderTrend.map(([label, amount]) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#60a5fa,#4f46e5)]"
                    style={{ height: `${Math.max((amount / maxTrendValue) * 100, 18)}%` }}
                  />
                  <div className="text-center text-xs text-slate-500">
                    <div>{label}</div>
                    <div className="mt-1 font-medium text-slate-700">{formatCurrency(amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className="border-0 shadow-none" title="No order trend yet" description="Revenue bars will appear after order activity starts flowing in." />
          )}
        </DataCard>

        <DataCard title="Store activity" description="Quick view of order load across active branches.">
          <div className="space-y-4">
            {data.storeSales.length ? (
              data.storeSales.map((store) => (
                <div key={store.storeId}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{store.storeName}</div>
                      <div className="text-xs text-slate-500">{formatCurrency(store.revenue)} revenue</div>
                    </div>
                    <StatusBadge tone={store.active ? "success" : "neutral"}>{store.ordersCount} orders</StatusBadge>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#4f46e5)]"
                      style={{ width: `${Math.min((store.ordersCount / Math.max(...data.storeSales.map((item) => item.ordersCount), 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState className="border-0 shadow-none" title="No store sales yet" description="Store comparisons will appear after checkout activity is recorded." />
            )}
          </div>
        </DataCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <DataCard title="Recent orders" description="Latest order activity flowing in from the storefront.">
          <div className="admin-scrollbar overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Store</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.orderId} className="admin-table-row">
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">#ORD{order.orderId}</div>
                      <div className="text-xs text-slate-400">{formatShortDate(order.createdAt)}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-slate-900">{order.customerName}</div>
                      <div className="text-xs text-slate-400">{order.contactPhone}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-600">{order.storeName}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{formatCurrency(order.amount)}</td>
                    <td className="px-3 py-4">
                      <StatusBadge
                        tone={
                          order.status === "DELIVERED"
                            ? "success"
                            : order.status === "CANCELLED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {formatStatus(order.status)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {!data.recentOrders.length ? (
                  <tr>
                    <td className="px-3 py-12 text-center text-slate-400" colSpan={5}>
                      No recent orders yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </DataCard>

        <DataCard title="Order status mix" description="Live status split across the current order book.">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: statusChartBackground }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <div className="text-2xl font-bold tracking-[-0.04em] text-slate-950">{data.totalOrders}</div>
                <div className="text-xs text-slate-500">Orders</div>
              </div>
            </div>
            <div className="space-y-3">
              {data.orderStatuses.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                    <span className="text-slate-600">{formatStatus(item.status)}</span>
                  </div>
                  <span className="font-semibold text-slate-950">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </DataCard>

        <DataCard title="Storefront signals" description="Visibility checkpoints the admin should keep an eye on.">
          <div className="space-y-3">
            <div className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active banners</div>
              <div className="mt-2 text-xl font-bold tracking-[-0.04em] text-slate-950">{activeBanners}</div>
              <div className="mt-1 text-sm text-slate-500">Homepage campaigns currently published</div>
            </div>
            <div className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Low stock products</div>
              <div className="mt-2 text-xl font-bold tracking-[-0.04em] text-slate-950">{data.lowStockProducts}</div>
              <div className="mt-1 text-sm text-slate-500">Products that need restock attention</div>
            </div>
            <div className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Enquiries</div>
              <div className="mt-2 text-xl font-bold tracking-[-0.04em] text-slate-950">{data.newEnquiries}</div>
              <div className="mt-1 text-sm text-slate-500">Fresh conversations awaiting response</div>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
