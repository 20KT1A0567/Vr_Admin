import { useMemo, useState } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, Send, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import type { AdminCartItem } from "types";

function formatCurrency(value?: number) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export function CartManagementPage() {
  const cartQuery = useQuery({ queryKey: ["admin-cart-items"], queryFn: adminApi.getCartItems });
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminCartItem | null>(null);

  const items = cartQuery.data ?? [];
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item) => {
      const blob = `${item.user.name} ${item.user.email ?? ""} ${item.user.phone ?? ""} ${item.product.title} ${item.product.sku ?? ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [items, search]);

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.product.price ?? 0), 0);
  const uniqueCustomers = new Set(items.map((item) => item.user.id)).size;

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    try {
      await adminApi.deleteCartItem(pendingDelete.id);
      toast.success("Cart item removed");
      await cartQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove cart item"));
    } finally {
      setPendingDelete(null);
    }
  }

  async function recoverCart(item: AdminCartItem) {
    try {
      const response = await adminApi.recoverCartItem(item.id);
      toast.success(response.message || "Cart recovery queued");
      await cartQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to queue cart recovery"));
    }
  }

  if (cartQuery.isLoading) {
    return <SkeletonLoader lines={8} />;
  }

  if (cartQuery.error) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-6 w-6" />}
        title="Cart management could not be loaded"
        description={getApiErrorMessage(cartQuery.error, "The backend cart admin API could not be loaded.")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace Intent"
        title="Cart Orchestration"
        description="Monitor real-time customer intent and abandoned inventory. Manage live cart nodes, evaluate conversion potential, and initiate recovery protocols."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Intent Nodes"
            value={String(items.length)}
            meta="Active customer carts"
            icon={<ShoppingCart className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Reserved Units"
            value={String(totalQuantity)}
            meta="Units held in session"
            icon={<PackageSearch className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Unique Profiles"
            value={String(uniqueCustomers)}
            meta="Engaged marketplace nodes"
            icon={<Send className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Economic Flow"
            value={formatCurrency(totalValue)}
            meta="Cumulative cart magnitude"
            icon={<Trash2 className="h-6 w-6" />}
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
              placeholder="Identify intent via customer identity, product SKU, or title…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex h-14 items-center gap-6 rounded-[1.25rem] border border-slate-100 bg-white px-8 text-xs dark:border-white/5 dark:bg-slate-800">
            <span className="font-black uppercase tracking-widest text-slate-400">Projected Value</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(totalValue)}</span>
          </div>
        </div>

        {!filteredItems.length ? (
          <div className="p-6">
            <EmptyState
              icon={<ShoppingCart className="h-6 w-6" />}
              title={search ? "No cart items match the search" : "No cart items found"}
              description="Live cart records will appear here after customers add products to cart."
            />
          </div>
        ) : (
          <div className="admin-scrollbar overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-4 py-4">Product</th>
                  <th className="px-4 py-4">Qty</th>
                  <th className="px-4 py-4">Value</th>
                  <th className="px-4 py-4">Stock</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="admin-table-row">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{item.user.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.user.email || item.user.phone || `Customer #${item.user.id}`}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <ProductThumb item={item} />
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-950">{item.product.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.product.brandName ?? "No brand"} / {item.product.sku ?? `#${item.product.id}`}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Chip className="!rounded-full !bg-blue-50 !font-bold !text-[#1E63F2]" label={item.quantity} />
                    </td>
                    <td className="px-4 py-4 font-black text-slate-950">{formatCurrency(Number(item.product.price ?? 0) * Number(item.quantity ?? 0))}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{item.product.stockQuantity ?? 0} available</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip title={item.recoverable ? "Queue recovery follow-up" : "No customer contact available"}>
                          <span>
                            <IconButton
                              className="!h-10 !w-10 !border !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50 disabled:!opacity-40"
                              disabled={!item.recoverable}
                              onClick={() => recoverCart(item)}
                            >
                              <Send className="h-4 w-4" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Remove cart item">
                          <IconButton className="!h-10 !w-10 !border !border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => setPendingDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Remove cart item?"
        description={pendingDelete ? `This removes ${pendingDelete.product.title} from ${pendingDelete.user.name}'s cart.` : "This removes the selected cart item."}
        confirmLabel="Remove item"
        tone="danger"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="admin-shell-muted p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="admin-display mt-2 text-3xl font-black text-slate-950">{value}</div>
    </article>
  );
}

function ProductThumb({ item }: { item: AdminCartItem }) {
  const imageUrl = item.product.images?.[0]?.imageUrl;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageSearch className="h-5 w-5 text-slate-400" />}
    </div>
  );
}
