import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, PackageSearch, RefreshCcw, Store as StoreIcon, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { DataTable } from "components/admin/DataTable";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title="Inventory control"
        description="Monitor stock health, mapped stores, and visibility from a cleaner operations-focused stock workspace."
        actions={
          <Link className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold" to="/products">
            Manage products
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Stock"
            value={String(totalStock)}
            meta={`${filteredProducts.length} products`}
            icon={<Boxes className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="Low Stock"
            value={String(lowStock)}
            meta="Below threshold"
            icon={<TriangleAlert className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend={lowStock > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Critical"
            value={String(criticalStock)}
            meta="Out of stock"
            icon={<RefreshCcw className="h-5 w-5" />}
            accentClassName="bg-rose-50 text-rose-700"
            trend={criticalStock > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Store Mapped"
            value={String(mappedProducts)}
            meta={`${stores.length} stores configured`}
            icon={<StoreIcon className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend="up"
          />
        </div>
      </PageHeader>

      <FilterBar
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>{filteredProducts.length} rows in the current inventory view</span>
            <button
              type="button"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              onClick={() => {
                setSearch("");
                setStoreFilter("ALL");
                setCategoryFilter("ALL");
                setStockFilter("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <SearchInput
            placeholder="Search product, SKU, brand, or processor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-select" value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}>
            <option value="ALL">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <select className="admin-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className="admin-select" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockStatus)}>
            <option value="ALL">All stock states</option>
            <option value="HEALTHY">Healthy</option>
            <option value="LOW">Low</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </FilterBar>

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
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  {product.images[0]?.imageUrl ? (
                    <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <PackageSearch className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{product.title}</div>
                  <div className="text-xs text-slate-400">{product.brandName ?? "Unassigned brand"}</div>
                </div>
              </div>
            )
          },
          {
            key: "stores",
            header: "Mapped Stores",
            render: (product) => (
              <div className="flex flex-wrap gap-2">
                {product.stores.length ? (
                  product.stores.map((store) => (
                    <span key={store.id} className="admin-chip">
                      <StoreIcon className="h-3 w-3" />
                      {store.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No store mapping</span>
                )}
              </div>
            )
          },
          {
            key: "stock",
            header: "Stock",
            render: (product) => {
              const status = getStockStatus(product);
              const tone = status === "HEALTHY" ? "success" : status === "LOW" ? "warning" : "danger";
              return (
                <div className="space-y-2">
                  <StatusBadge tone={tone}>
                    {product.stockQuantity ?? 0} units
                  </StatusBadge>
                  <div className="text-xs text-slate-400">Threshold {getThreshold(product)}</div>
                </div>
              );
            }
          },
          {
            key: "price",
            header: "Price",
            render: (product) => <span className="font-semibold text-slate-900">{formatCurrency(product.price)}</span>
          },
          {
            key: "visibility",
            header: "Visibility",
            render: (product) => (
              <StatusBadge tone={product.available ? "success" : "neutral"}>
                {product.available ? "Visible" : "Hidden"}
              </StatusBadge>
            )
          },
          {
            key: "actions",
            header: "Actions",
            render: (product) => (
              <div className="flex flex-wrap gap-2">
                <button className="admin-chip text-slate-700 hover:text-slate-950" type="button" onClick={() => adjustStock(product, "RESTOCK")}>
                  Quick restock
                </button>
                <button className="admin-chip text-slate-700 hover:text-slate-950" type="button" onClick={() => adjustStock(product, "ADJUSTMENT")}>
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
