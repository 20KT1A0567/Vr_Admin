import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function OrdersPage() {
  const { data: orders = [], refetch } = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.getOrders });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchMatch = `${order.contactName} ${order.contactPhone} ${order.store?.name ?? ""} ${order.id}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : order.status === statusFilter;
      const paymentMatch = paymentFilter === "ALL" ? true : order.paymentStatus === paymentFilter;
      return searchMatch && statusMatch && paymentMatch;
    });
  }, [orders, paymentFilter, search, statusFilter]);

  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  async function updateStatus(orderId: number, value: string, type: "status" | "payment") {
    if (type === "status") {
      await adminApi.updateOrderStatus(orderId, value);
    } else {
      await adminApi.updatePaymentStatus(orderId, value);
    }
    toast.success("Order updated");
    await refetch();
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Orders</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">A cleaner order desk for status changes, payment tracking, and store fulfilment.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              This screen follows the reference admin layout and turns order control into a simple searchable table instead of stacked cards.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total orders</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{orders.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pending</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{pendingCount}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Revenue</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(totalRevenue)}</div>
            </article>
          </div>
        </div>
      </section>

      <section className="admin-shell p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] flex-1 max-w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" placeholder="Search customer, phone, store, or order ID" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="admin-select min-w-[180px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              {["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"].map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
            <select className="admin-select min-w-[180px]" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="ALL">All payments</option>
              {["PENDING", "PAID", "FAILED", "REFUNDED"].map((option) => (
                <option key={option} value={option}>
                  {formatStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">Order</th>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Store</th>
                <th className="pb-3 pr-4 font-medium">Amount</th>
                <th className="pb-3 pr-4 font-medium">Items</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">
                    <div className="font-medium text-slate-900">#ORD{order.id}</div>
                    <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-slate-800">{order.contactName}</div>
                    <div className="text-xs text-slate-400">{order.contactPhone}</div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{order.store?.name ?? "Not assigned"}</td>
                  <td className="py-4 pr-4 font-medium text-slate-900">{formatCurrency(order.totalAmount)}</td>
                  <td className="py-4 pr-4 text-slate-600">{order.items.length} item(s)</td>
                  <td className="py-4 pr-4">
                    <select className="admin-select min-w-[160px]" value={order.status} onChange={(event) => updateStatus(order.id, event.target.value, "status")}>
                      {["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELLED"].map((option) => (
                        <option key={option} value={option}>
                          {formatStatus(option)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4">
                    <select className="admin-select min-w-[160px]" value={order.paymentStatus} onChange={(event) => updateStatus(order.id, event.target.value, "payment")}>
                      {["PENDING", "PAID", "FAILED", "REFUNDED"].map((option) => (
                        <option key={option} value={option}>
                          {formatStatus(option)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!filteredOrders.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders match this search yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="admin-shell-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivered orders</div>
            <div className="admin-display mt-2 text-2xl font-semibold text-slate-950">{deliveredCount}</div>
          </div>
          <div className="admin-shell-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Awaiting action</div>
            <div className="admin-display mt-2 text-2xl font-semibold text-slate-950">{pendingCount}</div>
          </div>
          <div className="admin-shell-muted p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Filtered rows</div>
            <div className="admin-display mt-2 text-2xl font-semibold text-slate-950">{filteredOrders.length}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
