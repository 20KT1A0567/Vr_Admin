import { useMemo, useState } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Heart, PackageSearch, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import type { AdminWishlistItem } from "types";

function formatDate(value?: string) {
  if (!value) {
    return "Recently";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Recently";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(parsed));
}

function formatCurrency(value?: number) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export function WishlistManagementPage() {
  const wishlistQuery = useQuery({ queryKey: ["admin-wishlist-items"], queryFn: adminApi.getWishlistItems });
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminWishlistItem | null>(null);

  const items = wishlistQuery.data ?? [];
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

  const uniqueCustomers = new Set(items.map((item) => item.user.id)).size;
  const uniqueProducts = new Set(items.map((item) => item.product.id)).size;
  const wishlistValue = items.reduce((sum, item) => sum + Number(item.product.price ?? 0), 0);

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    try {
      await adminApi.deleteWishlistItem(pendingDelete.id);
      toast.success("Wishlist item removed");
      await wishlistQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove wishlist item"));
    } finally {
      setPendingDelete(null);
    }
  }

  if (wishlistQuery.isLoading) {
    return <SkeletonLoader lines={8} />;
  }

  if (wishlistQuery.error) {
    return (
      <EmptyState
        icon={<Heart className="h-6 w-6" />}
        title="Wishlist management could not be loaded"
        description={getApiErrorMessage(wishlistQuery.error, "The backend wishlist admin API could not be loaded.")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace Intent"
        title="Wishlist Orchestration"
        description="Track saved product nodes and customer purchase signals. Monitor high-interest inventory and manage intent-driven session data."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Intent Nodes"
            value={String(items.length)}
            meta="Total saved product links"
            icon={<Heart className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Unique Profiles"
            value={String(uniqueCustomers)}
            meta="Engaged marketplace nodes"
            icon={<PackageSearch className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Monitored Units"
            value={String(uniqueProducts)}
            meta="Products under watchlist"
            icon={<PackageSearch className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Intent Flow"
            value={formatCurrency(wishlistValue)}
            meta="Projected wishlist magnitude"
            icon={<Heart className="h-6 w-6" />}
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
            <span className="font-black uppercase tracking-widest text-slate-400">Aggregated Intent Value</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(wishlistValue)}</span>
          </div>
        </div>

        {!filteredItems.length ? (
          <div className="p-6">
            <EmptyState
              icon={<Heart className="h-6 w-6" />}
              title={search ? "No wishlist items match the search" : "No wishlist items found"}
              description="Customer saved products will appear here after they add items to wishlist."
            />
          </div>
        ) : (
          <div className="admin-scrollbar overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-4 py-4">Product</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Added</th>
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
                    <td className="px-4 py-4 font-black text-slate-950">{formatCurrency(item.product.price)}</td>
                    <td className="px-4 py-4">
                      <Chip className="!rounded-full !bg-rose-50 !font-bold !text-rose-600" label={item.product.available ? "Available" : "Hidden"} />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{formatDate(item.addedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Tooltip title="Remove wishlist item">
                        <IconButton className="!h-10 !w-10 !border !border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => setPendingDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
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
        title="Remove wishlist item?"
        description={pendingDelete ? `This removes ${pendingDelete.product.title} from ${pendingDelete.user.name}'s wishlist.` : "This removes the selected wishlist item."}
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

function ProductThumb({ item }: { item: AdminWishlistItem }) {
  const imageUrl = item.product.images?.[0]?.imageUrl;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <PackageSearch className="h-5 w-5 text-slate-400" />}
    </div>
  );
}
