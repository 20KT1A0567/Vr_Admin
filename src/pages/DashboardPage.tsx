import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Button, Paper } from "@mui/material";
import {
  AlertTriangle,
  Boxes,
  IndianRupee,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { SkeletonLoader } from "components/admin/SkeletonLoader";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function formatStatus(status: string) {
  return status.split("_").join(" ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function statusColor(status: string) {
  const normalized = status.toUpperCase();
  if (["DELIVERED", "COMPLETED", "PAID"].includes(normalized)) {
    return { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" };
  }
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(normalized)) {
    return { bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" };
  }
  if (["SHIPPED", "CONFIRMED", "PACKED"].includes(normalized)) {
    return { bg: "#DBEAFE", color: "#1D4ED8", border: "#BFDBFE" };
  }
  return { bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" };
}

const chartColors = ["#6E72FC", "#22C55E", "#FF8A65", "#F59E0B", "#14B8A6", "#3B82F6", "#A855F7"];
type PeriodKey = "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";

const periodTabs: Array<{ key: PeriodKey; label: string; helper: string }> = [
  { key: "TODAY", label: "Today", helper: "today" },
  { key: "WEEK", label: "Week", helper: "this week" },
  { key: "MONTH", label: "Month", helper: "this month" },
  { key: "ALL_TIME", label: "All Time", helper: "all time" }
];

const reportHours = ["10 AM", "11 AM", "12 PM", "01 PM", "02 PM", "03 PM", "04 PM", "05 PM"];

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("MONTH");
  const selectedPeriod = periodTabs.find((tab) => tab.key === period) ?? periodTabs[2];
  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard", period], queryFn: () => adminApi.getDashboard(period) });
  const bannersQuery = useQuery({ queryKey: ["admin-banners"], queryFn: adminApi.getBanners });

  const data = dashboardQuery.data;
  const banners = bannersQuery.data ?? [];
  const activeBanners = banners.filter((banner) => banner.active).length;

  const revenueTrendData = useMemo(() => {
    const values = (data?.storeSales ?? []).slice(0, 8);
    return reportHours.map((label, index) => {
      const point = values[index];
      const fallbackRevenue = values.length ? values[index % values.length].revenue : 0;
      return {
        label,
        value: Math.max(12, Math.round(Number(point?.revenue ?? fallbackRevenue) / 1000) || 0),
        orders: point?.ordersCount ?? 0,
        store: point?.storeName?.replace("VR Technologies - ", "") ?? "VR Store"
      };
    });
  }, [data?.storeSales]);

  const orderStatusBars = useMemo(
    () =>
      (data?.orderStatuses ?? []).slice(0, 7).map((item, index) => ({
        label: formatStatus(item.status).split(" ")[0],
        fullLabel: formatStatus(item.status),
        value: Math.min(100, Math.max(8, Number(item.percentage) || 0)),
        count: item.count,
        fill: chartColors[index % chartColors.length]
      })),
    [data?.orderStatuses]
  );

  const topSellingGroups = useMemo(() => {
    const products = data?.topProducts ?? [];
    const maxRevenue = Math.max(...products.map((item) => Number(item.revenue) || 0), 1);
    return products.slice(0, 4).map((product, index) => ({
      id: product.productId,
      name: product.title,
      percentage: Math.max(18, Math.round(((Number(product.revenue) || 0) / maxRevenue) * 100)),
      accent: chartColors[index % chartColors.length]
    }));
  }, [data?.topProducts]);

  const handleRefresh = () => {
    void Promise.all([dashboardQuery.refetch(), bannersQuery.refetch()]);
  };

  if (dashboardQuery.isLoading && !data) {
    return (
      <div className="space-y-5">
        <Paper elevation={0} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <SkeletonLoader lines={5} />
        </Paper>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Paper key={index} elevation={0} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <SkeletonLoader lines={3} />
            </Paper>
          ))}
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <EmptyState
        title="Dashboard data is unavailable"
        description={getApiErrorMessage(dashboardQuery.error, "The dashboard API did not return metrics.")}
        action={
          <Button variant="contained" onClick={handleRefresh} className="!rounded-xl !bg-[#6E72FC] !px-5 !normal-case">
            Retry
          </Button>
        }
      />
    );
  }

  if (!data) {
    return <EmptyState title="No dashboard data" description="The backend returned an empty dashboard response." />;
  }

  const statCards = [
    {
      label: "Total Orders",
      value: formatNumber(data.totalOrders),
      helper: `${selectedPeriod.helper} activity`,
      icon: ShoppingBag,
      iconShell: "bg-[#F0EBFF] text-[#6E72FC]"
    },
    {
      label: "Total Sales",
      value: formatCurrency(data.totalRevenue),
      helper: `${formatNumber(data.activeStores)} active stores`,
      icon: IndianRupee,
      iconShell: "bg-[#E8FFF2] text-[#22C55E]"
    },
    {
      label: "Total Pending",
      value: formatNumber(data.pendingOrders),
      helper: `${formatNumber(data.lowStockProducts)} stock alerts`,
      icon: AlertTriangle,
      iconShell: "bg-[#FFF0EA] text-[#FF8A65]"
    },
    {
      label: "Total Users",
      value: formatNumber(data.totalUsers),
      helper: `${formatNumber(data.newEnquiries)} new enquiries`,
      icon: Users,
      iconShell: "bg-[#FFF7E8] text-[#F59E0B]"
    }
  ];

  return (
    <div className="space-y-6">
      <Paper
        elevation={0}
        className="overflow-hidden rounded-[38px] border border-white/70 bg-[linear-gradient(135deg,#f7fbff_0%,#f3f7ff_55%,#f8fbff_100%)] p-4 shadow-[0_25px_70px_rgba(148,163,184,0.18)] lg:p-6"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.22em] text-[#6E72FC]">Dashboard</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Performance Overview</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                  A cleaner command dashboard for orders, revenue, product demand, and storefront momentum for {selectedPeriod.helper}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
                  {periodTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPeriod(tab.key)}
                      className={`rounded-full px-4 py-2 text-sm font-black transition ${
                        period === tab.key ? "bg-[#6E72FC] text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-950"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="contained"
                  startIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={handleRefresh}
                  className="!h-11 !rounded-2xl !bg-[#6E72FC] !px-5 !font-bold !normal-case hover:!bg-[#5e63ec]"
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Paper
                    key={stat.label}
                    elevation={0}
                    className="rounded-[26px] border border-white/80 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.12)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.iconShell}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-500">{stat.label}</div>
                        <div className="mt-1 truncate text-3xl font-black tracking-tight text-slate-950">{stat.value}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{stat.helper}</div>
                  </Paper>
                );
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <Paper elevation={0} className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
                <DashboardPanelHeader title="Reports" description="Revenue movement across your top-performing stores." />
                {revenueTrendData.length ? (
                  <div className="mt-5 h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData} margin={{ left: -18, right: 8, top: 18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashboardTrendFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#6E72FC" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#6E72FC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#EEF2FF" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 18, border: "1px solid #E2E8F0", boxShadow: "0 20px 36px rgba(148,163,184,0.18)" }}
                          formatter={(value, name, item) => [
                            name === "value" ? `${formatNumber(Number(value))} pts` : value,
                            name === "value" ? `Sales - ${item.payload.store}` : "Orders"
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#4F6BFF"
                          strokeWidth={3}
                          fill="url(#dashboardTrendFill)"
                          activeDot={{ r: 7, fill: "#ffffff", stroke: "#6E72FC", strokeWidth: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <InlineEmpty title="No report data yet" />
                )}
              </Paper>

              <Paper elevation={0} className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
                <DashboardPanelHeader title="Order Status" description="Current delivery and payment stage mix." />
                {orderStatusBars.length ? (
                  <div className="mt-5 h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderStatusBars} margin={{ left: -18, right: 0, top: 10, bottom: 0 }}>
                        <CartesianGrid stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: 18, border: "1px solid #E2E8F0", boxShadow: "0 20px 36px rgba(148,163,184,0.18)" }}
                          formatter={(value, _name, item) => [`${value}%`, `${item.payload.fullLabel} (${item.payload.count})`]}
                        />
                        <Bar dataKey="value" radius={[12, 12, 4, 4]} maxBarSize={30}>
                          {orderStatusBars.map((item) => (
                            <Cell key={item.label} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <InlineEmpty title="No order status data" />
                )}
              </Paper>
            </div>
          </div>

          <div className="space-y-5">
            <Paper elevation={0} className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
              <DashboardPanelHeader title="Quick Pulse" description="Fast signals from commerce and operations." />
              <div className="mt-4 space-y-3">
                <MiniSignalCard label="Campaigns Live" value={activeBanners} accent="bg-[#EEF2FF] text-[#6E72FC]" />
                <MiniSignalCard label="Low Stock Items" value={data.lowStockProducts} accent="bg-[#FFF4E8] text-[#F59E0B]" />
                <MiniSignalCard label="Store Coverage" value={data.activeStores} accent="bg-[#EAFBF1] text-[#22C55E]" />
                <MiniSignalCard label="Product Range" value={data.totalProducts} accent="bg-[#F4EDFF] text-[#8B5CF6]" />
              </div>
            </Paper>

            <Paper elevation={0} className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
              <DashboardPanelHeader title="Low Stock Watch" description="Items that need fast replenishment." />
              <div className="mt-4 space-y-3">
                {data.lowStockItems.slice(0, 4).map((product) => (
                  <div key={product.productId} className="rounded-[22px] border border-[#FDE7CC] bg-[#FFF9F2] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{product.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{product.storeNames?.join(", ") || "No store assigned"}</div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                        {product.stockQuantity ?? 0} left
                      </span>
                    </div>
                  </div>
                ))}
                {!data.lowStockItems.length ? <InlineEmpty title="No low stock items" compact /> : null}
              </div>
            </Paper>
          </div>
        </div>
      </Paper>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <Paper elevation={0} className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <DashboardPanelHeader title="Recent Orders" description="Latest transactions flowing through the storefront." />
            <ShoppingBag className="h-5 w-5 text-[#6E72FC]" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-[#FBFCFF] text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-black">Tracking No</th>
                  <th className="px-5 py-4 font-black">Customer</th>
                  <th className="px-5 py-4 font-black">Store</th>
                  <th className="px-5 py-4 font-black">Amount</th>
                  <th className="px-5 py-4 font-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => {
                  const color = statusColor(order.status);
                  return (
                    <tr key={order.orderId} className="border-t border-slate-100 transition hover:bg-[#FAFBFF]">
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-950">#{order.orderId}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatShortDate(order.createdAt)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="!h-10 !w-10 !bg-[#EEF2FF] !text-sm !font-black !text-[#6E72FC]">{order.customerName?.charAt(0) || "C"}</Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{order.customerName}</div>
                            <div className="text-xs text-slate-500">{order.contactPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{order.storeName}</td>
                      <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(order.amount)}</td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-black"
                          style={{ backgroundColor: color.bg, color: color.color, border: `1px solid ${color.border}` }}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!data.recentOrders.length ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-500" colSpan={5}>
                      No recent orders from the backend yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Paper>

        <Paper elevation={0} className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_18px_46px_rgba(148,163,184,0.12)]">
          <DashboardPanelHeader title="Top Selling Products" description="Revenue leaders from your current catalog." />
          <div className="mt-6 space-y-5">
            {topSellingGroups.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.accent }} />
                    <span className="truncate font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-500">{item.percentage}%</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.accent }} />
                </div>
              </div>
            ))}
            {!topSellingGroups.length ? <InlineEmpty title="No top products yet" compact /> : null}
          </div>

          <div className="mt-8 rounded-[24px] border border-slate-100 bg-[#FAFBFF] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#6E72FC]">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Catalog Summary</div>
                <div className="mt-1 text-xl font-black text-slate-950">{formatNumber(data.totalProducts)} products live</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryMini label="Stores" value={formatNumber(data.totalStores)} />
              <SummaryMini label="Enquiries" value={formatNumber(data.newEnquiries)} />
            </div>
          </div>
        </Paper>
      </div>
    </div>
  );
}

function DashboardPanelHeader({ description, title }: { description: string; title: string }) {
  return (
    <div>
      <h2 className="text-[1.35rem] font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function MiniSignalCard({ accent, label, value }: { accent: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-[#FCFDFF] p-4">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{formatNumber(value)}</div>
      </div>
      <div className={`rounded-2xl px-3 py-2 text-xs font-black ${accent}`}>Live</div>
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white bg-white p-3 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function InlineEmpty({ compact = false, title }: { compact?: boolean; title: string }) {
  return (
    <div className={`flex items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500 ${compact ? "p-4" : "min-h-[220px] p-8"}`}>
      <PackageCheck className="mr-2 h-4 w-4 text-[#6E72FC]" />
      {title}
    </div>
  );
}
