import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, RefreshCcw, Search, Send } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title="Payment recovery"
        description="Find failed online payments, inspect the latest attempt, and queue a recovery follow-up for the customer."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Failed payments" value={orders.length} />
        <Metric label="Recoverable value" value={formatCurrency(orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0))} />
        <Metric label="Razorpay attempts" value={orders.filter((order) => order.latestPayment?.gateway === "RAZORPAY").length} />
      </div>

      <section className="admin-card-elevated overflow-hidden rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">Failed payment orders</h2>
            <p className="mt-1 text-sm text-slate-500">Queue reminders for customers who can retry payment from their order page.</p>
          </div>
          <label className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" placeholder="Search failed payments" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
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
