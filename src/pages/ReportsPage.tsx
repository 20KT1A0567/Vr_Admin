import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Boxes, CheckCircle2, ClipboardList, Download, IndianRupee, PackageSearch, ShoppingBag, Store, TrendingUp, XCircle } from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import type { AdminStorePerformance } from "types";

type PeriodKey = "TODAY" | "WEEK" | "MONTH" | "ALL_TIME";
type SortKey = "revenue" | "ordersCount" | "deliveredRate" | "unitsSold" | "topProductRevenueShare";

const periodTabs: Array<{ key: PeriodKey; label: string; helper: string }> = [
  { key: "TODAY", label: "Today", helper: "Today" },
  { key: "WEEK", label: "Week", helper: "This Week" },
  { key: "MONTH", label: "Month", helper: "This Month" },
  { key: "ALL_TIME", label: "All Time", helper: "All time" }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function percent(value?: number) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function compactName(value: string) {
  return value.replace("VR Technologies - ", "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>("MONTH");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [selectedStoreId, setSelectedStoreId] = useState<"ALL" | string>("ALL");

  const storePerformanceQuery = useQuery({
    queryKey: ["admin-store-performance", period],
    queryFn: () => adminApi.getStorePerformance(period)
  });
  const allTimePerformanceQuery = useQuery({
    queryKey: ["admin-store-performance", "ALL_TIME"],
    queryFn: () => adminApi.getStorePerformance("ALL_TIME")
  });
  const activitySummaryQuery = useQuery({ queryKey: ["admin-activity-summary"], queryFn: adminApi.getActivitySummary });
  const couponAnalyticsQuery = useQuery({ queryKey: ["admin-coupon-analytics"], queryFn: adminApi.getCouponAnalytics });

  const periodStores = storePerformanceQuery.data ?? [];
  const allPeriodStores = allTimePerformanceQuery.data ?? [];
  const storeOptions = allPeriodStores.length ? allPeriodStores : periodStores;
  const stores = useMemo(
    () => (selectedStoreId === "ALL" ? periodStores : periodStores.filter((store) => String(store.storeId) === selectedStoreId)),
    [periodStores, selectedStoreId]
  );
  const allTimeStores = useMemo(
    () => (selectedStoreId === "ALL" ? allPeriodStores : allPeriodStores.filter((store) => String(store.storeId) === selectedStoreId)),
    [allPeriodStores, selectedStoreId]
  );
  const selectedPeriod = periodTabs.find((tab) => tab.key === period) ?? periodTabs[2];
  const selectedStore = selectedStoreId === "ALL" ? null : storeOptions.find((store) => String(store.storeId) === selectedStoreId) ?? null;
  const storeScopeLabel = selectedStore ? compactName(selectedStore.storeName) : "All stores";
  const error = storePerformanceQuery.error;

  const totals = useMemo(() => {
    const revenue = stores.reduce((sum, store) => sum + Number(store.revenue || 0), 0);
    const pipeline = stores.reduce((sum, store) => sum + Number(store.pipelineRevenue || 0), 0);
    const orders = stores.reduce((sum, store) => sum + Number(store.ordersCount || 0), 0);
    const delivered = stores.reduce((sum, store) => sum + Number(store.deliveredOrdersCount || 0), 0);
    const cancelled = stores.reduce((sum, store) => sum + Number(store.cancelledOrdersCount || 0), 0);
    const units = stores.reduce((sum, store) => sum + Number(store.unitsSold || 0), 0);
    const products = stores.reduce((sum, store) => sum + Number(store.productsCount || 0), 0);
    const lowStock = stores.reduce((sum, store) => sum + Number(store.lowStockProductsCount || 0), 0);
    const averageOrder = delivered ? revenue / delivered : orders ? revenue / orders : 0;
    const deliveredRate = orders ? (delivered * 100) / orders : 0;
    return { revenue, pipeline, orders, delivered, cancelled, units, products, lowStock, averageOrder, deliveredRate };
  }, [stores]);

  const allTimeTotals = useMemo(() => {
    const orders = allTimeStores.reduce((sum, store) => sum + Number(store.ordersCount || 0), 0);
    const revenue = allTimeStores.reduce((sum, store) => sum + Number(store.revenue || 0), 0);
    const delivered = allTimeStores.reduce((sum, store) => sum + Number(store.deliveredOrdersCount || 0), 0);
    return { orders, revenue, delivered };
  }, [allTimeStores]);

  const sortedStores = useMemo(() => {
    return stores.slice().sort((a, b) => Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0));
  }, [sortKey, stores]);

  const topProducts = useMemo(() => {
    const productMap = new Map<number, { productId: number; title: string; soldQuantity: number; revenue: number; storeNames: string[]; stockQuantity?: number }>();
    for (const store of stores) {
      for (const product of store.topProducts) {
        const current = productMap.get(product.productId) ?? {
          productId: product.productId,
          title: product.title,
          soldQuantity: 0,
          revenue: 0,
          storeNames: [],
          stockQuantity: product.stockQuantity
        };
        current.soldQuantity += Number(product.soldQuantity || 0);
        current.revenue += Number(product.revenue || 0);
        if (!current.storeNames.includes(store.storeName)) {
          current.storeNames.push(store.storeName);
        }
        productMap.set(product.productId, current);
      }
    }
    return Array.from(productMap.values())
      .sort((left, right) => right.revenue - left.revenue || right.soldQuantity - left.soldQuantity)
      .slice(0, 8);
  }, [stores]);

  const chartData = sortedStores.map((store) => ({
    name: compactName(store.storeName),
    revenue: Number(store.revenue || 0),
    orders: Number(store.ordersCount || 0),
    deliveredRate: Number(store.deliveredRate || 0)
  }));

  async function downloadBackup() {
    try {
      downloadBlob(await adminApi.exportBackupZip(), "vrtech-backup.zip");
    } catch (downloadError) {
      alert(getApiErrorMessage(downloadError, "Backup could not be downloaded."));
    }
  }

  if (storePerformanceQuery.isLoading && !stores.length) {
    return (
      <div className="space-y-5">
        <section className="admin-shell p-6">
          <SkeletonLoader lines={10} />
        </section>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Store wise income could not be loaded" description={getApiErrorMessage(error, "The period-wise store report could not be loaded.")} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace Analytics"
        title="Command Telemetry"
        description="Monitor global performance across the physical and digital ecosystem. Real-time telemetry on revenue, order flow, and logistics health."
        variant="premium"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" onClick={() => void downloadBackup()}>
              <Download className="h-4 w-4" />
              Export ZIP
            </button>
            <div className="relative">
              <Store className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select className="admin-input !h-16 !rounded-[2rem] !bg-white/10 !border-white/20 pl-14 pr-8 text-white shadow-none focus:ring-4 focus:ring-white/10 appearance-none" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
                <option value="ALL" className="text-slate-900">All Nodes</option>
                {storeOptions.map((store) => (
                  <option key={store.storeId} value={String(store.storeId)} className="text-slate-900">
                    {compactName(store.storeName)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Gross Volume"
            value={formatCurrency(totals.revenue)}
            meta={`${selectedPeriod.label} Performance`}
            icon={<IndianRupee className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Protocol Success"
            value={percent(totals.deliveredRate)}
            meta={`${formatNumber(totals.delivered)} Shipments`}
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Avg Intensity"
            value={formatCurrency(totals.averageOrder)}
            meta="Revenue per order"
            icon={<TrendingUp className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Segment Flow"
            value={formatNumber(totals.units)}
            meta={`${formatNumber(totals.products)} Catalog SKUs`}
            icon={<Boxes className="h-6 w-6" />}
            variant="glass"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-2xl bg-white/5 p-1 backdrop-blur-md border border-white/10 shadow-2xl">
            {periodTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === tab.key ? "bg-white text-slate-900 shadow-xl" : "text-white/60 hover:text-white"
                }`}
                onClick={() => setPeriod(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <section className="admin-card-elevated overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-slate-900">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.65fr)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,var(--color-primary),var(--color-bg)_52%,var(--color-secondary))] opacity-90 p-6 xl:border-b-0 xl:border-r">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Marketplace pulse</div>
            <h2 className="admin-display mt-4 text-4xl font-black text-slate-950">{formatCurrency(totals.revenue)}</h2>
            <div className="mt-3 inline-flex items-center rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              {storeScopeLabel}
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              {formatNumber(totals.orders)} orders, {formatNumber(totals.delivered)} delivered, and {formatNumber(totals.units)} units sold in {selectedPeriod.helper.toLowerCase()}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="admin-chip admin-chip-active">{formatNumber(totals.orders)} orders</span>
              <span className="admin-chip text-emerald-700">{formatCurrency(totals.revenue)} income</span>
              <span className="admin-chip text-blue-700">{percent(totals.deliveredRate)} delivered</span>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 2xl:grid-cols-4">
            <PulseCard icon={<IndianRupee className="h-5 w-5" />} label="Sales" value={formatCurrency(totals.revenue)} helper={selectedPeriod.helper} tone="orange" />
            <PulseCard icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={formatNumber(totals.orders)} helper={`${formatNumber(totals.delivered)} delivered`} tone="cyan" />
            <PulseCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Order" value={formatCurrency(totals.averageOrder)} helper="Income per order" tone="violet" />
            <PulseCard icon={<Boxes className="h-5 w-5" />} label="Products Sold" value={formatNumber(totals.units)} helper={`${formatNumber(totals.products)} catalog products`} tone="green" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Admin Audit" value={formatNumber(activitySummaryQuery.data?.todayChanges ?? 0)} meta="Changes Logged" icon={<ClipboardList className="h-5 w-5" />} variant="glass" className="bg-blue-500/10 dark:bg-blue-500/5" />
        <StatCard label="Security Risks" value={formatNumber(activitySummaryQuery.data?.failedLoginsToday ?? 0)} meta="Failed Attempts" icon={<XCircle className="h-5 w-5" />} variant="glass" className="bg-rose-500/10 dark:bg-rose-500/5" />
        <StatCard label="Return Queue" value={formatNumber(activitySummaryQuery.data?.openReturns ?? 0)} meta="Active Requests" icon={<PackageSearch className="h-5 w-5" />} variant="glass" className="bg-amber-500/10 dark:bg-amber-500/5" />
        <StatCard label="Payment Fail" value={formatNumber(activitySummaryQuery.data?.failedPayments ?? 0)} meta="Revenue Recovery" icon={<IndianRupee className="h-5 w-5" />} variant="glass" className="bg-violet-500/10 dark:bg-violet-500/5" />
        <StatCard label="Campaign Hits" value={formatNumber((couponAnalyticsQuery.data ?? []).reduce((sum, item) => sum + item.usageCount, 0))} meta="Coupon Utility" icon={<TrendingUp className="h-5 w-5" />} variant="glass" className="bg-emerald-500/10 dark:bg-emerald-500/5" />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-[0.12em] text-slate-600">Orders - {selectedPeriod.helper}</h2>
          </div>
          <select className="admin-select !min-h-[42px]" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="revenue">Sort by income</option>
            <option value="ordersCount">Sort by orders</option>
            <option value="deliveredRate">Sort by delivered</option>
            <option value="unitsSold">Sort by products sold</option>
            <option value="topProductRevenueShare">Sort by top product share</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={formatNumber(totals.orders)} helper={selectedPeriod.helper} tone="violet" />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Delivered" value={formatNumber(totals.delivered)} helper={selectedPeriod.helper} tone="green" />
          <MetricCard icon={<XCircle className="h-5 w-5" />} label="Cancelled" value={formatNumber(totals.cancelled)} helper={selectedPeriod.helper} tone="rose" />
          <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Total Orders (All)" value={formatNumber(allTimeTotals.orders)} helper={`${formatCurrency(allTimeTotals.revenue)} all-time income`} tone="blue" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black uppercase tracking-[0.12em] text-slate-600">Income - {selectedPeriod.helper}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<IndianRupee className="h-5 w-5" />} label="Income" value={formatCurrency(totals.revenue)} helper="Delivered revenue" tone="blue" />
          <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Pipeline" value={formatCurrency(totals.pipeline)} helper="Open order value" tone="violet" />
          <MetricCard icon={<PackageSearch className="h-5 w-5" />} label="Units Sold" value={formatNumber(totals.units)} helper="Non-cancelled items" tone="green" />
          <MetricCard icon={<Boxes className="h-5 w-5" />} label="Low Stock" value={formatNumber(totals.lowStock)} helper="Current stock risk" tone="amber" />
        </div>
      </section>

      <section className="admin-card-elevated rounded-[26px] p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Store income and delivered trend</h2>
            <p className="mt-1 text-sm text-slate-500">Branch-wise income bars with delivered-rate quality line for the selected period.</p>
          </div>
          <ArrowDownUp className="h-5 w-5 text-[#1E63F2]" />
        </div>
        {chartData.length ? (
          <div className="h-[360px]">
            <ResponsiveContainer height="100%" width="100%" minWidth={0}>
              <ComposedChart data={chartData} margin={{ left: 0, right: 20, top: 12, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} tickLine={false} />
                <YAxis yAxisId="revenue" tick={{ fill: "#64748B", fontSize: 12 }} tickFormatter={(value) => `Rs ${Math.round(Number(value) / 1000)}k`} tickLine={false} width={64} />
                <YAxis yAxisId="rate" orientation="right" tick={{ fill: "#64748B", fontSize: 12 }} tickFormatter={(value) => `${value}%`} tickLine={false} width={48} />
                <Tooltip formatter={(value, key) => [key === "revenue" ? formatCurrency(Number(value)) : key === "deliveredRate" ? percent(Number(value)) : formatNumber(Number(value)), key === "revenue" ? "Income" : key === "deliveredRate" ? "Delivered rate" : "Orders"]} />
                <Bar yAxisId="revenue" dataKey="revenue" radius={[12, 12, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#0EA5A8" : "#2563EB"} />)}
                </Bar>
                <Line yAxisId="rate" dataKey="deliveredRate" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No period data yet" description="Orders for the selected period will appear here." />
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="admin-card-elevated rounded-[26px] p-5">
          <h2 className="text-xl font-black text-slate-950">Store breakdown</h2>
          <div className="admin-scrollbar mt-5 overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-[color:var(--color-bg)] text-xs uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Income</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Cancelled</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">AOV</th>
                  <th className="px-4 py-3">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {sortedStores.map((store) => (
                  <StoreRow key={store.storeId} store={store} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card-elevated rounded-[26px] p-5">
          <h2 className="text-xl font-black text-slate-950">Top products sold</h2>
          <p className="mt-1 text-sm text-slate-500">Product sales from the selected period, grouped across stores.</p>
          <div className="mt-5 space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.productId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-950">#{index + 1} {product.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{product.storeNames.map(compactName).join(", ")}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-black text-slate-950">{formatCurrency(product.revenue)}</div>
                    <div className="text-xs font-semibold text-slate-500">{formatNumber(product.soldQuantity)} sold</div>
                  </div>
                </div>
              </div>
            ))}
            {!topProducts.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                No product sales for this period.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function PulseCard({ helper, icon, label, tone, value }: { helper: string; icon: ReactNode; label: string; tone: "cyan" | "green" | "orange" | "violet"; value: string }) {
  const toneClass = {
    cyan: "border-cyan-100 bg-cyan-50/35 text-cyan-700",
    green: "border-emerald-100 bg-emerald-50/35 text-emerald-700",
    orange: "border-orange-100 bg-orange-50/35 text-orange-700",
    violet: "border-violet-100 bg-violet-50/35 text-violet-700"
  }[tone];

  return (
    <article className={`rounded-[28px] border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">{label}</div>
          <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
          <div className="mt-2 text-sm font-black text-slate-500">{helper}</div>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">{icon}</span>
      </div>
    </article>
  );
}

function MetricCard({ helper, icon, label, tone, value }: { helper: string; icon: ReactNode; label: string; tone: "amber" | "blue" | "green" | "rose" | "violet"; value: string }) {
  const toneClass = {
    amber: "border-amber-100 bg-amber-50/30 text-amber-700",
    blue: "border-blue-100 bg-blue-50/30 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/30 text-emerald-700",
    rose: "border-rose-100 bg-rose-50/30 text-rose-700",
    violet: "border-violet-100 bg-violet-50/30 text-violet-700"
  }[tone];

  return (
    <article className={`rounded-[28px] border p-6 shadow-sm ${toneClass}`}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/80 shadow-sm">{icon}</div>
      <div className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-black text-slate-950">{value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{helper}</div>
    </article>
  );
}

function StoreRow({ store }: { store: AdminStorePerformance }) {
  return (
    <tr className="admin-table-row">
      <td className="px-4 py-4">
        <div className="font-black text-slate-950">{store.storeName}</div>
        <div className="text-xs text-slate-500">{store.city} · {store.active ? "Active" : "Inactive"}</div>
      </td>
      <td className="px-4 py-4 font-black text-slate-950">{formatCurrency(store.revenue)}</td>
      <td className="px-4 py-4">{formatNumber(store.ordersCount)}</td>
      <td className="px-4 py-4 text-emerald-700">{formatNumber(store.deliveredOrdersCount)} <span className="text-xs text-slate-400">({percent(store.deliveredRate)})</span></td>
      <td className="px-4 py-4 text-rose-600">{formatNumber(store.cancelledOrdersCount)}</td>
      <td className="px-4 py-4">{formatNumber(store.unitsSold)}</td>
      <td className="px-4 py-4">{formatCurrency(store.averageOrderValue)}</td>
      <td className="px-4 py-4">{formatCurrency(store.pipelineRevenue)}</td>
    </tr>
  );
}
