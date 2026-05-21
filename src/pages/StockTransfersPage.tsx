import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, PackagePlus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import type { Product, StockTransferPayload, Store } from "types";

interface TransferFormState {
  productId: string;
  fromStoreId: string;
  toStoreId: string;
  quantity: string;
  reason: string;
}

const emptyForm: TransferFormState = {
  productId: "",
  fromStoreId: "",
  toStoreId: "",
  quantity: "1",
  reason: ""
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function productLabel(product: Product) {
  const sku = product.sku ? ` • ${product.sku}` : "";
  const stock = typeof product.stockQuantity === "number" ? ` • ${product.stockQuantity} in stock` : "";
  return `${product.title}${sku}${stock}`;
}

function storeLabel(store: Store) {
  return `${store.name} • ${store.city}`;
}

export function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransferFormState>(emptyForm);

  const productsQuery = useQuery({ queryKey: ["admin-products-transfer-options"], queryFn: () => adminApi.getProducts() });
  const storesQuery = useQuery({ queryKey: ["admin-stores-transfer-options"], queryFn: adminApi.getStores });
  const transfersQuery = useQuery({ queryKey: ["admin-stock-transfers"], queryFn: adminApi.getStockTransfers });

  const products = productsQuery.data ?? [];
  const stores = storesQuery.data ?? [];
  const transfers = transfersQuery.data ?? [];

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(form.productId)),
    [form.productId, products]
  );

  const sourceStores = useMemo(() => {
    if (!selectedProduct || !selectedProduct.stores?.length) {
      return stores;
    }
    const mappedIds = new Set(selectedProduct.stores.map((store) => store.id));
    return stores.filter((store) => mappedIds.has(store.id));
  }, [selectedProduct, stores]);

  const transferMutation = useMutation({
    mutationFn: (payload: StockTransferPayload) => adminApi.transferStock(payload),
    onSuccess: async () => {
      toast.success("Stock transfer completed");
      setForm(emptyForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-stock-transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-stock-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-products-transfer-options"] })
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to transfer stock"));
    }
  });

  function update<K extends keyof TransferFormState>(key: K, value: TransferFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const payload: StockTransferPayload = {
      productId: Number(form.productId),
      fromStoreId: Number(form.fromStoreId),
      toStoreId: Number(form.toStoreId),
      quantity,
      reason: form.reason.trim() || undefined
    };
    if (!payload.productId || !payload.fromStoreId || !payload.toStoreId) {
      toast.error("Choose product, source store, and destination store");
      return;
    }
    if (payload.fromStoreId === payload.toStoreId) {
      toast.error("Source and destination stores must be different");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    transferMutation.mutate(payload);
  }

  const isLoading = productsQuery.isLoading || storesQuery.isLoading || transfersQuery.isLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Logistics Intelligence"
        title="Branch Orchestration"
        description="Synchronize inventory across your ecosystem. Execute store-to-store transfers, monitor branch mapping, and maintain global stock parity."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Transfers"
            value={String(transfers.length)}
            meta="Committed logistics routes"
            icon={<ArrowRightLeft className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Branch Nodes"
            value={String(stores.length)}
            meta="Synchronized warehouse locations"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Catalog Depth"
            value={String(products.length)}
            meta="Available inventory nodes"
            icon={<PackagePlus className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Logistics State"
            value="Optimal"
            meta="Core transfer integrity"
            icon={<ArrowRightLeft className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form className="admin-card-elevated border-none bg-white p-10 shadow-2xl dark:bg-slate-900" onSubmit={handleSubmit}>
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Logistics Protocol
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Initialize Transfer</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Coordinate stock movement between branch nodes while maintaining ledger parity.</p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              Product
              <select className="admin-input mt-2" value={form.productId} onChange={(event) => update("productId", event.target.value)}>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {productLabel(product)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                From store
                <select className="admin-input mt-2" value={form.fromStoreId} onChange={(event) => update("fromStoreId", event.target.value)}>
                  <option value="">Source branch</option>
                  {sourceStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {storeLabel(store)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                To store
                <select className="admin-input mt-2" value={form.toStoreId} onChange={(event) => update("toStoreId", event.target.value)}>
                  <option value="">Destination branch</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {storeLabel(store)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700">
              Quantity
              <input
                className="admin-input mt-2"
                min="1"
                type="number"
                value={form.quantity}
                onChange={(event) => update("quantity", event.target.value)}
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Reason
              <textarea
                className="admin-input mt-2 min-h-[110px] resize-y"
                placeholder="Example: Guntur branch requested 2 units for walk-in demo."
                value={form.reason}
                onChange={(event) => update("reason", event.target.value)}
              />
            </label>
          </div>

          <button
            className="admin-button-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black"
            disabled={transferMutation.isPending}
            type="submit"
          >
            {transferMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Complete transfer
          </button>
        </form>

        <div className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Logistics Ledger
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Store-to-Store Transfers</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Audit trail of the latest 100 committed logistics routes.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Logistics Stream</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm font-semibold text-slate-500">Loading transfers...</div>
          ) : transfers.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="admin-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-left">Route</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-left">Reason</th>
                    <th className="px-5 py-3 text-left">By</th>
                    <th className="px-5 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">{transfer.productTitle}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2 font-bold text-slate-700">
                          <span>{transfer.fromStoreName}</span>
                          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                          <span>{transfer.toStoreName}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Out #{transfer.outMovementId ?? "-"} • In #{transfer.inMovementId ?? "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right text-base font-black text-slate-950">{transfer.quantity}</td>
                      <td className="max-w-[260px] px-5 py-4 text-slate-500">{transfer.reason || "-"}</td>
                      <td className="px-5 py-4 text-slate-500">{transfer.initiatedByEmail || "-"}</td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(transfer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm font-semibold text-slate-500">No stock transfers recorded yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
