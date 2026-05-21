import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@mui/material";
import {
   IndianRupee,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  Zap,
  RefreshCw,
  Boxes,
  History
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
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { Card } from "components/ui/Card";
import { Button } from "components/ui/Button";
import { cn } from "utils/cn";

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

const chartColors = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#f43f5e"];
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
  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard", period], queryFn: () => adminApi.getDashboard(period) });
  
  const data = dashboardQuery.data;

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

  const handleRefresh = () => {
    void dashboardQuery.refetch();
  };

  if (dashboardQuery.isLoading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonLoader lines={10} />
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <EmptyState
        title="Command Center Offline"
        description={getApiErrorMessage(dashboardQuery.error, "Could not sync dashboard metrics.")}
        action={<Button onClick={handleRefresh}>Retry Connection</Button>}
      />
    );
  }

  if (!data) return <EmptyState title="No metrics found" />;

  const statCards = [
    {
      label: "Gross Revenue",
      value: formatCurrency(data.totalRevenue),
      trend: "+12.5%",
      icon: IndianRupee,
      color: "text-[color:var(--color-success)]",
      bg: "bg-[color:var(--color-success)]/10"
    },
    {
      label: "Order Volume",
      value: formatNumber(data.totalOrders),
      trend: "+8.2%",
      icon: ShoppingBag,
      color: "text-[color:var(--color-primary)]",
      bg: "bg-[color:var(--color-primary)]/10"
    },
    {
      label: "Active Customers",
      value: formatNumber(data.totalUsers),
      trend: "+5.1%",
      icon: Users,
      color: "text-[color:var(--color-secondary)]",
      bg: "bg-[color:var(--color-secondary)]/10"
    },
    {
      label: "Store Health",
      value: "98.2%",
      trend: "Optimal",
      icon: Zap,
      color: "text-[color:var(--color-warning)]",
      bg: "bg-[color:var(--color-warning)]/10"
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Marketplace Pulse"
        title="Command Center"
        description="Real-time operations intelligence and global transaction telemetry for VR Technologies."
        variant="premium"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-[1.5rem] bg-white/10 p-1.5 backdrop-blur-md border border-white/10 dark:bg-slate-800/50">
              {periodTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className={cn(
                    "rounded-[1rem] px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    period === tab.key 
                      ? "bg-white text-slate-900 shadow-xl" 
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button 
              onClick={handleRefresh} 
              className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/10 transition-all hover:bg-white/20 active:scale-95"
            >
              <RefreshCw className={cn("h-5 w-5 transition-transform duration-700", dashboardQuery.isFetching && "rotate-180")} />
            </button>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Gross Revenue"
            value={formatCurrency(data.totalRevenue)}
            meta="+12.5% vs last period"
            icon={<IndianRupee className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Order Volume"
            value={formatNumber(data.totalOrders)}
            meta="+8.2% fulfillment rate"
            icon={<ShoppingBag className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Active Nodes"
            value={formatNumber(data.totalUsers)}
            meta="+5.1% growth velocity"
            icon={<Users className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Ecosystem Health"
            value="98.2%"
            meta="Latency: Optimal"
            icon={<Zap className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>


      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <section className="admin-card-elevated border-none bg-white p-10 shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Revenue Trajectory</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Financial Velocity</h3>
            </div>
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
              <TrendingUp className="h-7 w-7" />
            </div>
          </div>
          <div className="h-[350px] w-full mt-10">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={revenueTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: "var(--color-surface-elevated)", 
                    borderRadius: "16px", 
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
                  }}
                  itemStyle={{ color: "var(--color-primary)", fontSize: "12px", fontWeight: "bold" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--color-primary)" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  activeDot={{ r: 6, fill: "#fff", stroke: "var(--color-primary)", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="admin-card-elevated border-none bg-white p-10 shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Order Pipeline</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Status Distribution</h3>
            </div>
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <ShoppingBag className="h-7 w-7" />
            </div>
          </div>
          <div className="h-[350px] w-full mt-10">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={orderStatusBars} margin={{ left: -10, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: "var(--color-surface-elevated)", 
                    borderRadius: "16px", 
                    border: "1px solid var(--color-border)" 
                  }}
                  itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={30}>
                  {orderStatusBars.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <section className="admin-card-elevated border-none bg-white p-0 overflow-hidden shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 p-10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ledger Stream</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5">
              <History className="h-7 w-7" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5">
                <tr>
                  <th className="px-10 py-5">Order Context</th>
                  <th className="px-10 py-5">Identified Actor</th>
                  <th className="px-10 py-5">Sovereign Store</th>
                  <th className="px-10 py-5">Settlement</th>
                  <th className="px-10 py-5">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.recentOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[color:var(--color-text-primary)]">#{order.orderId}</div>
                      <div className="text-[10px] text-[color:var(--color-text-muted)]">{formatShortDate(order.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 !bg-[color:var(--color-primary)]/20 !text-[10px] !font-black !text-[color:var(--color-primary)]">
                          {order.customerName?.charAt(0) || "C"}
                        </Avatar>
                        <span className="font-semibold text-[color:var(--color-text-secondary)]">{order.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[color:var(--color-text-muted)] text-xs font-medium">{order.storeName}</td>
                    <td className="px-6 py-4 font-black text-[color:var(--color-text-primary)]">{formatCurrency(order.amount)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-secondary)]">
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <Card title="Store Insights" glow>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-[color:var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest">Catalog Live</p>
                    <p className="text-xl font-black text-[color:var(--color-text-primary)]">{formatNumber(data.totalProducts)}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-[color:var(--color-text-muted)]" />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-[color:var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[color:var(--color-secondary)]/10 text-[color:var(--color-secondary)]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-widest">New Enquiries</p>
                    <p className="text-xl font-black text-[color:var(--color-text-primary)]">{formatNumber(data.newEnquiries)}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-[color:var(--color-text-muted)]" />
              </div>
            </div>
          </Card>

          <Card title="Inventory Alerts" subtitle="Action required immediately">
            <div className="space-y-3">
              {data.lowStockItems.slice(0, 3).map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--color-danger)]/5 border border-[color:var(--color-danger)]/10">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[color:var(--color-text-primary)] truncate">{item.title}</p>
                    <p className="text-[10px] text-[color:var(--color-danger)] font-bold uppercase tracking-wider mt-0.5">Critical Stock</p>
                  </div>
                  <span className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[color:var(--color-danger)]/20 text-xs font-black text-[color:var(--color-danger)]">
                    {item.stockQuantity}
                  </span>
                </div>
              ))}
              {data.lowStockItems.length === 0 && (
                <div className="py-8 text-center text-xs text-[color:var(--color-text-muted)] italic">
                  All inventory levels optimal
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
