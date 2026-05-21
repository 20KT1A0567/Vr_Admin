import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, PackageSearch, RefreshCcw, Search, Store as StoreIcon, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { DataTable } from "components/admin/DataTable";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import type { Product, Store } from "types";
type StockStatus = "ALL" | "HEALTHY" | "LOW" | "CRITICAL";

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function getThreshold(product: Pick<Product, "lowStockThreshold">) {
  return product.lowStockThreshold ?? 5;
}

function getStockStatus(product: Pick<Product, "stockQuantity" | "lowStockThreshold">): Exclude<StockStatus, "ALL"> {
  const quantity = Number(product.stockQuantity ?? 0);
  const threshold = getThreshold(product);

  if (quantity <= 0) {
    return "CRITICAL";
  }
  if (quantity <= threshold) {
    return "LOW";
  }
  return "HEALTHY";
}

export function InventoryPage() {
  const productsQuery = useQuery<Product[]>({
    queryKey: ["admin-products", "inventory"],
    queryFn: () => adminApi.getProducts()
  });
  const storesQuery = useQuery<Store[]>({ queryKey: ["admin-stores-all"], queryFn: adminApi.getStores });

  const products = productsQuery.data ?? [];
  const stores = storesQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<StockStatus>("ALL");

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.categoryName).filter(Boolean))) as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `${product.title} ${product.brandName ?? ""} ${product.categoryName ?? ""} ${product.processor ?? ""} ${product.sku ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const storeMatch =
        storeFilter === "ALL" ? true : product.stores.some((store) => String(store.id) === storeFilter);
      const categoryMatch = categoryFilter === "ALL" ? true : product.categoryName === categoryFilter;
      const stockMatch = stockFilter === "ALL" ? true : getStockStatus(product) === stockFilter;

      return text && storeMatch && categoryMatch && stockMatch;
    });
  }, [categoryFilter, products, search, stockFilter, storeFilter]);

  const totalStock = filteredProducts.reduce((sum, product) => sum + (product.stockQuantity ?? 0), 0);
  const lowStock = filteredProducts.filter((product) => getStockStatus(product) === "LOW").length;
  const criticalStock = filteredProducts.filter((product) => getStockStatus(product) === "CRITICAL").length;
  const mappedProducts = filteredProducts.filter((product) => product.stores.length > 0).length;

  async function adjustStock(product: Product, mode: "RESTOCK" | "ADJUSTMENT") {
    const rawQuantity = window.prompt(mode === "RESTOCK" ? "Quantity to add" : "New stock quantity", String(product.stockQuantity ?? 0));
    if (!rawQuantity) return;
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const reason = window.prompt("Reason", mode === "RESTOCK" ? "Quick restock" : "Manual stock adjustment") ?? undefined;
    try {
      await adminApi.adjustStock({ productId: product.id, movementType: mode, quantity, reason });
      toast.success("Stock updated");
      await productsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to update stock"));
    }
  }
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Logistics Protocol"
        title="Inventory Intelligence"
        description="Monitor global stock health, mapped store distribution, and visibility telemetry from a high-fidelity operations workbench."
        variant="premium"
        actions={
          <Link className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" to="/products">
            <Boxes className="h-4 w-4" />
            Catalog Master
          </Link>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ecosystem Reserve"
            value={String(totalStock)}
            meta={`${filteredProducts.length} unique SKUs`}
            icon={<Boxes className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Logistics Warning"
            value={String(lowStock)}
            meta="Below threshold"
            icon={<TriangleAlert className="h-6 w-6" />}
            variant="glass"
            trend="down"
          />
          <StatCard
            label="Critical Depletion"
            value={String(criticalStock)}
            meta="Zero stock nodes"
            icon={<RefreshCcw className="h-6 w-6" />}
            variant="glass"
            trend="down"
          />
          <StatCard
            label="Node Affinity"
            value={String(mappedProducts)}
            meta={`${stores.length} stores configured`}
            icon={<StoreIcon className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              Telemetry Filters
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Inventory Workbench</h2>
          </div>
          <button 
            type="button" 
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5" 
            onClick={() => {
              setSearch("");
              setStoreFilter("ALL");
              setCategoryFilter("ALL");
              setStockFilter("ALL");
            }}
          >
            Clear telemetry
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-16 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
              placeholder="Locate SKU, brand, or processor node..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 px-8 appearance-none dark:!bg-white/5" value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}>
            <option value="ALL">Node: All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <select className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 px-8 appearance-none dark:!bg-white/5" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="ALL">Segment: All</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 px-8 appearance-none dark:!bg-white/5" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockStatus)}>
            <option value="ALL">Status: All</option>
            <option value="HEALTHY">Status: Healthy</option>
            <option value="LOW">Status: Warning</option>
            <option value="CRITICAL">Status: Critical</option>
          </select>
        </div>
      </section>

      <DataTable
        data={filteredProducts}
        rowKey={(product) => product.id}
        emptyState="No products match the current inventory view."
        columns={[
          {
            key: "product",
            header: "Product",
            render: (product) => (
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">
                  {product.images[0]?.imageUrl ? (
                    <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <PackageSearch className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{product.title}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{product.brandName ?? "Unassigned"}</div>
                </div>
              </div>
            )
          },
          {
            key: "stores",
            header: "Node Affinity",
            render: (product) => (
              <div className="flex flex-wrap gap-2">
                {product.stores.length ? (
                  product.stores.map((store) => (
                    <span key={store.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-400">
                      <StoreIcon className="h-3 w-3" />
                      {store.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Standalone</span>
                )}
              </div>
            )
          },
          {
            key: "stock",
            header: "Reserve",
            render: (product) => {
              const status = getStockStatus(product);
              const tone = status === "HEALTHY" ? "success" : status === "LOW" ? "warning" : "danger";
              return (
                <div className="space-y-1">
                  <StatusBadge tone={tone}>
                    {product.stockQuantity ?? 0} Units
                  </StatusBadge>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Min: {getThreshold(product)}</div>
                </div>
              );
            }
          },
          {
            key: "price",
            header: "Valuation",
            render: (product) => <span className="font-black text-slate-900 dark:text-white">{formatCurrency(product.price)}</span>
          },
          {
            key: "visibility",
            header: "Status",
            render: (product) => (
              <StatusBadge tone={product.available ? "success" : "neutral"}>
                {product.available ? "Live" : "Archived"}
              </StatusBadge>
            )
          },
          {
            key: "actions",
            header: "Operations",
            render: (product) => (
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center justify-center rounded-xl bg-sky-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-600 transition-all hover:bg-sky-600 hover:text-white" type="button" onClick={() => adjustStock(product, "RESTOCK")}>
                  Restock
                </button>
                <button className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:text-slate-400" type="button" onClick={() => adjustStock(product, "ADJUSTMENT")}>
                  Adjust
                </button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
