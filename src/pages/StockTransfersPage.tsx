import { type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, PackagePlus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
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
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="admin-card-elevated rounded-[22px] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <ArrowRightLeft className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Transfers</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{transfers.length}</p>
            </div>
          </div>
        </div>
        <div className="admin-card-elevated rounded-[22px] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Mapped Branches</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{stores.length}</p>
            </div>
          </div>
        </div>
        <div className="admin-card-elevated rounded-[22px] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Catalog Items</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{products.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form className="admin-card-elevated rounded-[24px] p-6" onSubmit={handleSubmit}>
          <div className="admin-pill">Branch transfer</div>
          <h1 className="mt-3 text-2xl font-black text-slate-950">Move stock between stores</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Creates transfer-out and transfer-in movement rows while keeping total product stock unchanged.
          </p>

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

        <div className="admin-card-elevated overflow-hidden rounded-[24px]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <div className="admin-pill">History</div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Store-to-store transfers</h2>
              <p className="mt-1 text-sm text-slate-500">Latest 100 committed transfers with movement links.</p>
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
