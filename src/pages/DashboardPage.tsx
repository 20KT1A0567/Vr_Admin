import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Download,
  MessageSquareMore,
  PackageSearch,
  ShoppingBag,
  Store as StoreIcon,
  Users
} from "lucide-react";
import { adminApi } from "api/client";
import { StatCard } from "components/admin/StatCard";

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function formatStatus(status: string) {
  return status.split("_").join(" ");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
    case "PAID":
      return "bg-emerald-500";
    case "PROCESSING":
    case "CONFIRMED":
      return "bg-sky-500";
    case "SHIPPED":
    case "READY":
      return "bg-amber-500";
    case "CANCELLED":
    case "FAILED":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

const chartColors = ["#22c55e", "#8b5cf6", "#f59e0b", "#ef4444"];

export function DashboardPage() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: adminApi.getDashboard });

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

  if (!data) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Dashboard</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">A cleaner operations view for catalog, stores, orders, and customers.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              Monitor real order flow, store performance, inventory pressure, and customer demand from one overview screen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">17 May 2025 - 24 May 2025</div>
            <button className="admin-button-secondary">
              <Download className="mr-2 h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Orders" value={String(data.totalOrders)} meta="+ 18.7% vs last week" icon={<ShoppingBag className="h-5 w-5" />} accentClassName="bg-emerald-50 text-emerald-700" />
        <StatCard label="Total Sales" value={formatCurrency(data.totalRevenue)} meta="+ 22.5% vs last month" icon={<CircleDollarSign className="h-5 w-5" />} accentClassName="bg-sky-50 text-sky-700" />
        <StatCard label="Total Products" value={String(data.totalProducts)} meta={`${data.lowStockProducts} low stock items`} icon={<PackageSearch className="h-5 w-5" />} accentClassName="bg-violet-50 text-violet-700" />
        <StatCard label="Total Customers" value={String(data.totalUsers)} meta={`${data.newEnquiries} new enquiries`} icon={<Users className="h-5 w-5" />} accentClassName="bg-amber-50 text-amber-700" />
        <StatCard label="Total Stores" value={String(data.totalStores)} meta={`${data.activeStores} active stores`} icon={<StoreIcon className="h-5 w-5" />} accentClassName="bg-cyan-50 text-cyan-700" />
        <StatCard label="Pending Orders" value={String(data.pendingOrders)} meta="Awaiting next admin action" icon={<Boxes className="h-5 w-5" />} accentClassName="bg-orange-50 text-orange-700" />
        <StatCard label="Low Stock" value={String(data.lowStockProducts)} meta="Needs restock attention" icon={<AlertTriangle className="h-5 w-5" />} accentClassName="bg-rose-50 text-rose-700" />
        <StatCard label="Enquiries" value={String(data.newEnquiries)} meta="Customer follow-up queue" icon={<MessageSquareMore className="h-5 w-5" />} accentClassName="bg-fuchsia-50 text-fuchsia-700" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Sales overview</h2>
              <p className="mt-1 text-sm text-slate-500">Order value trend from recent checkout activity.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">This week</div>
          </div>

          <div className="mt-6">
            <div className="flex h-44 items-end gap-3">
              {orderTrend.map(([label, amount]) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="w-full rounded-t-[1rem] bg-[linear-gradient(180deg,#8b5cf6,#22c55e)]" style={{ height: `${Math.max((amount / maxTrendValue) * 100, 18)}%` }} />
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Order overview</h2>
              <p className="mt-1 text-sm text-slate-500">Current distribution of order states.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: statusChartBackground }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <div className="admin-display text-2xl font-semibold text-slate-950">{data.totalOrders}</div>
                <div className="text-xs text-slate-500">Total orders</div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {data.orderStatuses.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                    <span className="text-slate-600">{formatStatus(item.status)}</span>
                  </div>
                  <span className="font-medium text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Sales by stores</h2>
              <p className="mt-1 text-sm text-slate-500">Compare order count and revenue coverage.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">This week</div>
          </div>

          <div className="mt-6 space-y-4">
            {data.storeSales.map((store) => (
              <div key={store.storeId}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{store.storeName}</span>
                  <span className="text-slate-500">{store.ordersCount} orders</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#22c55e)]" style={{ width: `${Math.min((store.ordersCount / Math.max(...data.storeSales.map((item) => item.ordersCount), 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-500">Most recent store-linked order activity.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Order ID</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Store</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.orderId} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-800">#ORD{order.orderId}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800">{order.customerName}</div>
                      <div className="text-xs text-slate-400">{order.contactPhone}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{order.storeName}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatCurrency(order.amount)}</td>
                    <td className="py-3">
                      <span className={`admin-badge ${order.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : order.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Low stock alert</h2>
              <p className="mt-1 text-sm text-slate-500">Products that need attention soon.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.lowStockItems.map((item) => (
              <div key={item.productId} className="admin-shell-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.storeNames.join(", ") || "No store mapped"}</div>
                  </div>
                  <span className={`admin-badge ${item.stockQuantity && item.stockQuantity <= 2 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.stockQuantity ?? 0} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-shell p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-display text-xl font-semibold text-slate-950">Top selling products</h2>
              <p className="mt-1 text-sm text-slate-500">Best-performing products by sales.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.topProducts.map((product) => (
              <div key={product.productId} className="admin-shell-muted p-4">
                <div className="font-medium text-slate-900">{product.title}</div>
                <div className="mt-1 text-xs text-slate-500">{product.storeNames.join(", ") || "No store mapped"}</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{product.soldQuantity} sold</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
