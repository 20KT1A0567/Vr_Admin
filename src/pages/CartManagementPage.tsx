import { useMemo, useState } from "react";
import { Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, Send, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title="Cart management"
        description="Review live customer cart items, cart value, product interest, and remove stale entries when support needs it."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Cart rows" value={items.length} />
        <Metric label="Units held" value={totalQuantity} />
        <Metric label="Customers" value={uniqueCustomers} />
      </div>

      <Paper elevation={0} className="admin-card-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">Customer carts</h2>
            <p className="mt-1 text-sm text-slate-500">Estimated cart value: {formatCurrency(totalValue)}</p>
          </div>
          <label className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" placeholder="Search cart items" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
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
      </Paper>

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
