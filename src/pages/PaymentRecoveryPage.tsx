import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, RefreshCcw, Search, Send } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import type { Order } from "types";

function formatCurrency(value?: number) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

export function PaymentRecoveryPage() {
  const failedPaymentsQuery = useQuery({ queryKey: ["admin-failed-payments"], queryFn: adminApi.getFailedPayments });
  const [search, setSearch] = useState("");
  const [recoveringId, setRecoveringId] = useState<number | null>(null);

  const orders = failedPaymentsQuery.data ?? [];
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return orders;
    }
    return orders.filter((order) => `${order.orderNumber ?? ""} ${order.contactName} ${order.contactPhone} ${order.contactEmail ?? ""}`.toLowerCase().includes(query));
  }, [orders, search]);

  async function recover(order: Order) {
    setRecoveringId(order.id);
    try {
      const response = await adminApi.recoverFailedPayment(order.id);
      toast.success(response.message || "Payment recovery queued");
      await failedPaymentsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to queue payment recovery"));
    } finally {
      setRecoveringId(null);
    }
  }

  if (failedPaymentsQuery.isLoading) {
    return <SkeletonLoader lines={8} />;
  }

  if (failedPaymentsQuery.error) {
    return (
      <EmptyState
        icon={<CreditCard className="h-6 w-6" />}
        title="Payment recovery could not be loaded"
        description={getApiErrorMessage(failedPaymentsQuery.error, "The failed payment API could not be loaded.")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue Intelligence"
        title="Payment Recovery"
        description="Analyze transactional friction and execute recovery protocols. Identify abandoned checkouts and re-engage customers with session-resume triggers."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Failed Signals"
            value={String(orders.length)}
            meta="Active failure nodes"
            icon={<CreditCard className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Friction Value"
            value={formatCurrency(orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0))}
            meta="Recoverable economic flow"
            icon={<RefreshCcw className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Gateway Trace"
            value={String(orders.filter((order) => order.latestPayment?.gateway === "RAZORPAY").length)}
            meta="Razorpay attempt density"
            icon={<CreditCard className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Recovery State"
            value="Active"
            meta="Core protocol status"
            icon={<Send className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>


      <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-10 py-6 dark:border-white/5 dark:bg-white/2">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-[1.25rem] border-none bg-white py-4 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              placeholder="Identify friction via order node, customer name, or trace email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex h-14 items-center gap-6 rounded-[1.25rem] border border-slate-100 bg-white px-8 text-xs dark:border-white/5 dark:bg-slate-800">
            <span className="font-black uppercase tracking-widest text-slate-400">Total Frictional Flow</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0))}</span>
          </div>
        </div>

        {!filteredOrders.length ? (
          <div className="p-6">
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={search ? "No failed payments match" : "No failed payments"}
              description="Failed online payment orders will appear here for recovery."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Latest attempt</th>
                  <th className="px-4 py-4">Failure reason</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="admin-table-row">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{order.orderNumber ?? `#${order.id}`}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-950">{order.contactName}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.contactPhone || order.contactEmail || "-"}</div>
                    </td>
                    <td className="px-4 py-4 font-black text-slate-950">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="font-semibold">{order.latestPayment?.gateway ?? order.paymentMethod}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.latestPayment?.gatewayOrderId ?? "No gateway order"}</div>
                    </td>
                    <td className="max-w-[260px] px-4 py-4 text-slate-500">{order.latestPayment?.failureReason ?? "Payment failed or was not completed"}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="admin-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-emerald-700"
                        disabled={recoveringId === order.id}
                        onClick={() => recover(order)}
                        type="button"
                      >
                        {recoveringId === order.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Recover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="admin-shell-muted p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="admin-display mt-2 text-3xl font-black text-slate-950">{value}</div>
    </article>
  );
}
