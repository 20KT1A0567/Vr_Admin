import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, PackageSearch, Search, Sparkles, Store as StoreIcon } from "lucide-react";
import { adminApi } from "api/client";

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

export function InventoryPage() {
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: adminApi.getProducts });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores-all"], queryFn: adminApi.getStores });
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      `${product.title} ${product.brandName ?? ""} ${product.categoryName ?? ""} ${product.processor ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [products, search]);

  const totalStock = filteredProducts.reduce((sum, product) => sum + (product.stockQuantity ?? 0), 0);
  const visibleProducts = filteredProducts.filter((product) => product.available).length;
  const featuredProducts = filteredProducts.filter((product) => product.featured).length;

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Inventory</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">Track stock visibility, store assignment, and catalog readiness in one place.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              This view mirrors the reference inventory screen and gives a fast scan of which products are visible, featured, and mapped to each store.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted min-w-[160px] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total stock</div>
                  <div className="admin-display mt-1 text-2xl font-semibold text-slate-950">{totalStock}</div>
                </div>
              </div>
            </article>

            <article className="admin-shell-muted min-w-[160px] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Visible SKUs</div>
                  <div className="admin-display mt-1 text-2xl font-semibold text-slate-950">{visibleProducts}</div>
                </div>
              </div>
            </article>

            <article className="admin-shell-muted min-w-[160px] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Featured</div>
                  <div className="admin-display mt-1 text-2xl font-semibold text-slate-950">{featuredProducts}</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="admin-shell p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] flex-1 max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input pl-11"
              placeholder="Search SKU, brand, category, or processor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {filteredProducts.length} products across {stores.length} stores
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">Product</th>
                <th className="pb-3 pr-4 font-medium">Category</th>
                <th className="pb-3 pr-4 font-medium">Mapped stores</th>
                <th className="pb-3 pr-4 font-medium">Stock</th>
                <th className="pb-3 pr-4 font-medium">Price</th>
                <th className="pb-3 pr-4 font-medium">Visibility</th>
                <th className="pb-3 font-medium">Feature</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                        {product.images[0]?.imageUrl ? (
                          <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                        ) : (
                          <PackageSearch className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{product.title}</div>
                        <div className="text-xs text-slate-400">{product.brandName ?? "Unassigned brand"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{product.categoryName ?? "Unassigned"}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {product.stores.length ? (
                        product.stores.map((store) => (
                          <span key={store.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            <StoreIcon className="h-3 w-3" />
                            {store.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">No store mapping</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`admin-badge ${Number(product.stockQuantity ?? 0) <= 2 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {product.stockQuantity ?? 0} units
                    </span>
                  </td>
                  <td className="py-4 pr-4 font-medium text-slate-900">{formatCurrency(product.price)}</td>
                  <td className="py-4 pr-4">
                    <span className={product.available ? "admin-badge-green" : "admin-badge-slate"}>
                      {product.available ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={product.featured ? "admin-badge-amber" : "admin-badge-slate"}>
                      {product.featured ? "Homepage" : "Standard"}
                    </span>
                  </td>
                </tr>
              ))}
              {!filteredProducts.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products match this inventory search yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
