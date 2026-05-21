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
  Truck,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import { Card } from "components/ui/Card";
import { Button } from "components/ui/Button";
import { cn } from "utils/cn";
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
const statusTabValues = ["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function OrdersPage() {
  const { data: orders = [], isLoading, refetch } = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.getOrders });
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<(typeof statusTabValues)[number]>("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchMatch = `${order.orderNumber} ${order.contactName} ${order.contactPhone}`.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusTab === "ALL" ? true : order.status === statusTab;
      return searchMatch && statusMatch;
    });
  }, [orders, search, statusTab]);

  useEffect(() => {
    if (filteredOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId), [orders, selectedOrderId]);

  if (isLoading && !orders.length) {
    return (
      <div className="space-y-6">
        <SkeletonLoader lines={10} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Operations"
        title="Fulfillment Logistics"
        description="Real-time transaction tracking, logistics orchestration, and automated status synchronization."
        variant="premium"
        actions={
          <button className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-white dark:hover:bg-white dark:hover:text-slate-900">
            <Download className="h-4 w-4 transition-transform group-hover:-translate-y-1" />
            Export Orders
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Volume"
            value={String(orders.length)}
            meta="Lifetime transactions"
            icon={<ShoppingBag className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Pending Sync"
            value={String(orders.filter(o => o.status === 'PENDING').length)}
            meta="Awaiting fulfillment"
            icon={<Clock3 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="In Transit"
            value={String(orders.filter(o => o.status === 'SHIPPED').length)}
            meta="Active logistics"
            icon={<Truck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Concluded"
            value={String(orders.filter(o => o.status === 'DELIVERED').length)}
            meta="Successfully delivered"
            icon={<PackageCheck className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <div className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-[2rem] bg-slate-50 p-2 dark:bg-white/5 overflow-x-auto">
            {statusTabValues.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={cn(
                  "whitespace-nowrap rounded-[1.5rem] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all",
                  statusTab === tab 
                    ? "bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900" 
                    : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab === 'ALL' ? 'Global Stream' : formatStatus(tab)}
              </button>
            ))}
          </div>
          <div className="relative group min-w-[340px]">
            <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500" />
            <input
              type="text"
              placeholder="Search by ID, identity, or phone..."
              className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-16 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Orders List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div
                layout
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedOrderId(order.id)}
                className={cn(
                  "group relative w-full overflow-hidden rounded-[2rem] p-6 text-left transition-all duration-300",
                  selectedOrderId === order.id
                    ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 dark:bg-white dark:text-slate-900"
                    : "bg-white border border-slate-100 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300",
                      selectedOrderId === order.id 
                        ? "bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900" 
                        : (order.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-sky-50 text-sky-600 dark:bg-sky-500/10")
                    )}>
                      {order.status === 'DELIVERED' ? <CheckCircle2 className="h-6 w-6" /> : <Clock3 className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-black tracking-tight">#{order.orderNumber}</h4>
                        <span className={cn(
                          "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                          selectedOrderId === order.id 
                            ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" 
                            : (order.status === 'DELIVERED' ? "bg-emerald-500 text-white" : "bg-sky-500 text-white")
                        )}>
                          {formatStatus(order.status)}
                        </span>
                      </div>
                      <p className={cn("mt-1 truncate text-sm font-medium", selectedOrderId === order.id ? "text-white/70 dark:text-slate-500" : "text-slate-500")}>
                        {order.contactName} • {order.contactPhone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black tracking-tight">{formatCurrency(order.totalAmount)}</p>
                    <p className={cn("mt-1 text-[10px] font-bold uppercase tracking-widest", selectedOrderId === order.id ? "text-white/40 dark:text-slate-400" : "text-slate-400")}>
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  
                  <ChevronRight className={cn(
                    "h-5 w-5 transition-all",
                    selectedOrderId === order.id ? "text-white dark:text-slate-900 translate-x-1" : "text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                  )} />
                </div>
                {selectedOrderId === order.id && (
                  <motion.div layoutId="order-indicator" className="absolute -left-1 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.8)]" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredOrders.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-[color:var(--color-border)] rounded-3xl">
              <p className="text-[color:var(--color-text-muted)] font-bold uppercase tracking-widest text-sm">No orders found in queue</p>
            </div>
          )}
        </div>

        {/* Selected Order Details */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="admin-card-elevated border-none bg-slate-900 p-8 shadow-2xl dark:bg-white"
              >
                <div className="space-y-8">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 dark:bg-sky-500/10 dark:text-sky-600">
                      Operations Desk
                    </div>
                    <h2 className="mt-5 text-3xl font-black tracking-tight text-white dark:text-slate-900">Order Intelligence</h2>
                    <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol ID: {selectedOrder.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fulfilment Stage</label>
                      <select 
                        className="h-14 w-full rounded-2xl border-none bg-white/5 px-4 text-xs font-black uppercase tracking-widest text-white outline-none ring-1 ring-white/10 focus:ring-sky-500 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-200"
                        value={selectedOrder.status}
                        onChange={(e) => void adminApi.updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus).then(() => refetch())}
                      >
                        {orderStatusOptions.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Payment Status</label>
                      <select 
                        className="h-14 w-full rounded-2xl border-none bg-white/5 px-4 text-xs font-black uppercase tracking-widest text-white outline-none ring-1 ring-white/10 focus:ring-sky-500 dark:bg-slate-50 dark:text-slate-900 dark:ring-slate-200"
                        value={selectedOrder.paymentStatus}
                        onChange={(e) => void adminApi.updatePaymentStatus(selectedOrder.id, e.target.value as PaymentStatus).then(() => refetch())}
                      >
                        {paymentStatusOptions.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-[2rem] bg-white/5 p-6 border border-white/10 dark:bg-slate-50 dark:border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/10 text-sky-400 dark:bg-slate-900/5 dark:text-slate-900">
                          <Users className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white dark:text-slate-900">{selectedOrder.contactName}</p>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{selectedOrder.contactEmail || 'Unverified Identity'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-start gap-4 pt-6 border-t border-white/10 dark:border-slate-200">
                      <MapPin className="h-5 w-5 shrink-0 text-sky-500" />
                      <p className="text-sm font-medium leading-relaxed text-slate-400 dark:text-slate-600">
                        {selectedOrder.deliveryAddress || 'No static logistics coordinate specified.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cart Inventory ({selectedOrder.items.length} units)</p>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 dark:bg-slate-50">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white dark:text-slate-900 truncate">{item.product.title}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Qty {item.quantity} • {formatCurrency(item.priceAtTime)}</p>
                          </div>
                          <p className="text-sm font-black text-sky-400 ml-4">
                            {formatCurrency(item.quantity * item.priceAtTime)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10 flex items-center justify-between dark:border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Settlement Total</p>
                    <p className="text-4xl font-black text-white dark:text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="group flex items-center justify-center gap-3 rounded-2xl bg-sky-500 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-105">
                      <Truck className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      Ship Manifest
                    </button>
                    <Link to={`/orders/${selectedOrder.id}`} className="w-full">
                      <button className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/20 dark:bg-slate-100 dark:text-slate-900">
                        Audit Details
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-96 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-slate-600 text-sm font-bold uppercase tracking-widest px-12 text-center">
                Select an order manifest to view live operations
              </div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
