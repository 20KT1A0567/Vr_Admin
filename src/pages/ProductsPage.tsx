import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import type { Product } from "types";

type ProductFormState = {
  title: string;
  brandId: string;
  categoryId: string;
  storeIds: number[];
  modelNumber: string;
  processor: string;
  processorGeneration: string;
  ramGb: string;
  storageGb: string;
  storageType: string;
  displaySize: string;
  displayType: string;
  os: string;
  graphicsCard: string;
  battery: string;
  weight: string;
  warrantyMonths: string;
  warrantySummary: string;
  returnDays: string;
  sku: string;
  serialNumber: string;
  productCondition: "EXCELLENT" | "GOOD" | "FAIR";
  price: string;
  originalPrice: string;
  discountPercent: string;
  stockQuantity: string;
  available: boolean;
  featured: boolean;
  description: string;
};

type DraftProductImage = {
  imageUrl: string;
  publicId: string;
};

type ApiErrorEnvelope = {
  message?: string;
  data?: Record<string, string> | null;
};

const MIN_PRODUCT_IMAGES = 1;
const MAX_PRODUCT_IMAGES = 20;

const emptyForm: ProductFormState = {
  title: "",
  brandId: "",
  categoryId: "",
  storeIds: [],
  modelNumber: "",
  processor: "",
  processorGeneration: "",
  ramGb: "",
  storageGb: "",
  storageType: "SSD",
  displaySize: "",
  displayType: "",
  os: "",
  graphicsCard: "",
  battery: "",
  weight: "",
  warrantyMonths: "",
  warrantySummary: "",
  returnDays: "",
  sku: "",
  serialNumber: "",
  productCondition: "GOOD",
  price: "",
  originalPrice: "",
  discountPercent: "",
  stockQuantity: "1",
  available: true,
  featured: false,
  description: ""
};

const fieldLabels: Record<string, string> = {
  title: "Product title",
  brandId: "Brand",
  categoryId: "Category",
  storeIds: "Store assignment",
  price: "Selling price",
  images: "Images"
};

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseIntegerInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseDecimalInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateProductForm(form: ProductFormState, imageCount: number) {
  if (!form.title.trim()) {
    return "Enter a product title";
  }

  if (parseIntegerInput(form.brandId) === undefined) {
    return "Select a brand";
  }

  if (parseIntegerInput(form.categoryId) === undefined) {
    return "Select a category";
  }

  if (!form.storeIds.length) {
    return "Select at least 1 store";
  }

  if (imageCount < MIN_PRODUCT_IMAGES) {
    return "Upload at least 1 product image";
  }

  if (parseDecimalInput(form.price) === undefined) {
    return "Enter a valid selling price";
  }

  const integerFields: Array<[string, string]> = [
    [form.ramGb, "RAM value"],
    [form.storageGb, "storage value"],
    [form.warrantyMonths, "warranty months"],
    [form.returnDays, "return days"],
    [form.stockQuantity, "stock quantity"]
  ];

  for (const [value, label] of integerFields) {
    if (value.trim() && parseIntegerInput(value) === undefined) {
      return `Enter a valid ${label}`;
    }
  }

  if (form.originalPrice.trim() && parseDecimalInput(form.originalPrice) === undefined) {
    return "Enter a valid original price";
  }

  const discountPercent = parseIntegerInput(form.discountPercent);
  if (form.discountPercent.trim() && discountPercent === undefined) {
    return "Enter a valid discount percent";
  }

  if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
    return "Discount percent must be between 0 and 100";
  }

  return null;
}

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const envelope = error.response?.data;

    if (envelope?.message === "Validation failed" && envelope.data) {
      const [field, message] = Object.entries(envelope.data)[0] ?? [];
      if (field && message) {
        return `${fieldLabels[field] ?? field}: ${message}`;
      }
    }

    return envelope?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function toForm(product: Product): ProductFormState {
  return {
    title: product.title,
    brandId: String(product.brandId ?? ""),
    categoryId: String(product.categoryId ?? ""),
    storeIds: product.stores.map((store) => store.id),
    modelNumber: product.modelNumber ?? "",
    processor: product.processor ?? "",
    processorGeneration: product.processorGeneration ?? "",
    ramGb: String(product.ramGb ?? ""),
    storageGb: String(product.storageGb ?? ""),
    storageType: product.storageType ?? "SSD",
    displaySize: product.displaySize ?? "",
    displayType: product.displayType ?? "",
    os: product.os ?? "",
    graphicsCard: product.graphicsCard ?? "",
    battery: product.battery ?? "",
    weight: product.weight ?? "",
    warrantyMonths: String(product.warrantyMonths ?? ""),
    warrantySummary: product.warrantySummary ?? "",
    returnDays: String(product.returnDays ?? ""),
    sku: product.sku ?? "",
    serialNumber: product.serialNumber ?? "",
    productCondition: product.productCondition ?? "GOOD",
    price: String(product.price ?? ""),
    originalPrice: String(product.originalPrice ?? ""),
    discountPercent: String(product.discountPercent ?? ""),
    stockQuantity: String(product.stockQuantity ?? "1"),
    available: product.available,
    featured: product.featured,
    description: product.description ?? ""
  };
}

function toPayload(form: ProductFormState, images?: DraftProductImage[]) {
  return {
    title: form.title.trim(),
    brandId: parseIntegerInput(form.brandId),
    categoryId: parseIntegerInput(form.categoryId),
    storeIds: Array.from(new Set(form.storeIds)),
    modelNumber: normalizeText(form.modelNumber),
    processor: normalizeText(form.processor),
    processorGeneration: normalizeText(form.processorGeneration),
    ramGb: parseIntegerInput(form.ramGb),
    storageGb: parseIntegerInput(form.storageGb),
    storageType: normalizeText(form.storageType),
    displaySize: normalizeText(form.displaySize),
    displayType: normalizeText(form.displayType),
    os: normalizeText(form.os),
    graphicsCard: normalizeText(form.graphicsCard),
    battery: normalizeText(form.battery),
    weight: normalizeText(form.weight),
    warrantyMonths: parseIntegerInput(form.warrantyMonths),
    warrantySummary: normalizeText(form.warrantySummary),
    returnDays: parseIntegerInput(form.returnDays),
    sku: normalizeText(form.sku),
    serialNumber: normalizeText(form.serialNumber),
    productCondition: form.productCondition,
    price: parseDecimalInput(form.price),
    originalPrice: parseDecimalInput(form.originalPrice),
    discountPercent: parseIntegerInput(form.discountPercent),
    stockQuantity: parseIntegerInput(form.stockQuantity),
    available: form.available,
    featured: form.featured,
    description: normalizeText(form.description),
    images: images?.map((image) => ({ imageUrl: image.imageUrl, publicId: image.publicId }))
  };
}

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

export function ProductsPage() {
  const { data: products = [], refetch } = useQuery({ queryKey: ["admin-products"], queryFn: adminApi.getProducts });
  const { data: brands = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores-all"], queryFn: adminApi.getStores });

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "HIDDEN" | "FEATURED">("ALL");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [draftImages, setDraftImages] = useState<DraftProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchMatch = `${product.title} ${product.brandName ?? ""} ${product.processor ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const brandMatch = brandFilter ? String(product.brandId ?? "") === brandFilter : true;
      const categoryMatch = categoryFilter ? String(product.categoryId ?? "") === categoryFilter : true;
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && product.available) ||
        (statusFilter === "HIDDEN" && !product.available) ||
        (statusFilter === "FEATURED" && product.featured);
      return searchMatch && brandMatch && categoryMatch && statusMatch;
    });
  }, [products, search, brandFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    setForm(selectedProduct ? toForm(selectedProduct) : emptyForm);
  }, [selectedProduct]);

  const imageCount = selectedProduct ? selectedProduct.images.length : draftImages.length;
  const visibleProducts = products.filter((product) => product.available).length;
  const featuredProducts = products.filter((product) => product.featured).length;
  const lowStockProducts = products.filter((product) => Number(product.stockQuantity ?? 0) <= 2).length;

  function resetComposer() {
    setSelectedProductId(null);
    setForm(emptyForm);
    setDraftImages([]);
    setUploadingImages(false);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const remainingSlots = MAX_PRODUCT_IMAGES - imageCount;
    if (remainingSlots <= 0) {
      toast.error("A product can have maximum 20 images");
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} can be added`);
    }

    setUploadingImages(true);
    let uploadedCount = 0;
    const uploadedDraftImages: DraftProductImage[] = [];

    try {
      if (selectedProduct) {
        for (const file of filesToUpload) {
          await adminApi.uploadProductImage(selectedProduct.id, file);
          uploadedCount += 1;
        }
        toast.success(filesToUpload.length === 1 ? "Image uploaded" : `${filesToUpload.length} images uploaded`);
        await refetch();
        return;
      }

      for (const file of filesToUpload) {
        const uploaded = await adminApi.uploadMedia(file, "products");
        uploadedDraftImages.push({ imageUrl: uploaded.url, publicId: uploaded.publicId });
        uploadedCount += 1;
      }
      setDraftImages((current) => [...current, ...uploadedDraftImages]);
      toast.success(filesToUpload.length === 1 ? "Image uploaded" : `${filesToUpload.length} images uploaded`);
    } catch {
      if (uploadedDraftImages.length) {
        setDraftImages((current) => [...current, ...uploadedDraftImages]);
      }
      if (selectedProduct && uploadedCount > 0) {
        await refetch();
      }
      toast.error("Failed to upload product image");
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleDraftImageRemove(publicId: string) {
    setUploadingImages(true);
    try {
      await adminApi.deleteMedia(publicId);
      setDraftImages((current) => current.filter((image) => image.publicId !== publicId));
      toast.success("Image removed");
    } catch (error) {
      console.error("Failed to remove draft product image", error);
      toast.error(getApiErrorMessage(error, "Failed to remove image"));
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadingImages) {
      toast.error("Please wait for image uploads to finish");
      return;
    }

    const validationMessage = validateProductForm(form, imageCount);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      if (selectedProduct) {
        await adminApi.updateProduct(selectedProduct.id, toPayload(form));
        toast.success("Product updated");
      } else {
        await adminApi.createProduct(toPayload(form, draftImages));
        toast.success("Product created");
      }

      resetComposer();
      await refetch();
    } catch (error) {
      console.error("Failed to save product", error);
      toast.error(getApiErrorMessage(error, selectedProduct ? "Failed to update product" : "Failed to create product"));
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) {
      return;
    }

    try {
      await adminApi.deleteProduct(selectedProduct.id);
      toast.success("Product deleted");
      resetComposer();
      await refetch();
    } catch (error) {
      console.error("Failed to delete product", error);
      toast.error(getApiErrorMessage(error, "Failed to delete product"));
    }
  }

  async function handleExistingImageRemove(imageId: number) {
    if (!selectedProduct) {
      return;
    }

    try {
      await adminApi.deleteProductImage(selectedProduct.id, imageId);
      toast.success("Image removed");
      await refetch();
    } catch (error) {
      console.error("Failed to delete product image", error);
      toast.error(getApiErrorMessage(error, "Failed to remove image"));
    }
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Products</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">Product management built around clean scanning, quick edits, and strong media control.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              The page now follows the light admin reference style while keeping the existing create, update, delete, store mapping, and image upload behavior.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Visible products</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{visibleProducts}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Featured products</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{featuredProducts}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Low stock</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{lowStockProducts}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="admin-shell p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="admin-pill">Product Library</div>
                <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">Browse and filter inventory</h2>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {filteredProducts.length} results
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="admin-input pl-11" placeholder="Search title, brand, or processor" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className="admin-select" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select className="admin-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Visible</option>
                <option value="HIDDEN">Hidden</option>
                <option value="FEATURED">Featured</option>
              </select>
            </div>
          </div>

          <div className="admin-shell overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-4 py-4 font-medium">Category</th>
                    <th className="px-4 py-4 font-medium">Price</th>
                    <th className="px-4 py-4 font-medium">Stock</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={`border-t border-slate-100 ${selectedProductId === product.id ? "bg-emerald-50/50" : "bg-white"}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                            {product.images[0]?.imageUrl ? (
                              <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <PencilLine className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{product.title}</div>
                            <div className="text-xs text-slate-400">{product.brandName ?? "No brand"} / {product.processor ?? "No CPU"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{product.categoryName ?? "Unassigned"}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-4">
                        <span className={`admin-badge ${Number(product.stockQuantity ?? 0) <= 2 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                          {product.stockQuantity ?? 0} units
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className={product.available ? "admin-badge-green" : "admin-badge-slate"}>{product.available ? "Visible" : "Hidden"}</span>
                          {product.featured ? <span className="admin-badge-amber">Featured</span> : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          className="admin-button-secondary !px-4 !py-2"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setDraftImages([]);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredProducts.length ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No products match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <form className="admin-shell space-y-6 p-6 lg:p-7" onSubmit={handleSave}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="admin-pill">{selectedProduct ? "Edit Product" : "Add New Product"}</div>
              <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">
                {selectedProduct ? "Update listing details" : "Create a new catalog listing"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Use the editor to manage pricing, specs, store assignment, visibility, and media.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="admin-button-secondary" onClick={resetComposer}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </button>
              {selectedProduct ? (
                <button type="button" className="admin-button-secondary" onClick={handleDeleteProduct}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input className="admin-input" placeholder="Product title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <input className="admin-input" placeholder="Model number" value={form.modelNumber} onChange={(event) => setForm((current) => ({ ...current, modelNumber: event.target.value }))} />
            <select className="admin-select" value={form.brandId} onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))}>
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select className="admin-select" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className="admin-input" placeholder="Processor" value={form.processor} onChange={(event) => setForm((current) => ({ ...current, processor: event.target.value }))} />
            <input className="admin-input" placeholder="Processor generation" value={form.processorGeneration} onChange={(event) => setForm((current) => ({ ...current, processorGeneration: event.target.value }))} />
            <input className="admin-input" placeholder="RAM (GB)" value={form.ramGb} onChange={(event) => setForm((current) => ({ ...current, ramGb: event.target.value }))} />
            <input className="admin-input" placeholder="Storage (GB)" value={form.storageGb} onChange={(event) => setForm((current) => ({ ...current, storageGb: event.target.value }))} />
            <select className="admin-select" value={form.storageType} onChange={(event) => setForm((current) => ({ ...current, storageType: event.target.value }))}>
              <option value="SSD">SSD</option>
              <option value="HDD">HDD</option>
              <option value="NVMe">NVMe</option>
            </select>
            <select className="admin-select" value={form.productCondition} onChange={(event) => setForm((current) => ({ ...current, productCondition: event.target.value as ProductFormState["productCondition"] }))}>
              <option value="EXCELLENT">EXCELLENT</option>
              <option value="GOOD">GOOD</option>
              <option value="FAIR">FAIR</option>
            </select>
            <input className="admin-input" placeholder="Selling price" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
            <input className="admin-input" placeholder="Original price" value={form.originalPrice} onChange={(event) => setForm((current) => ({ ...current, originalPrice: event.target.value }))} />
            <input className="admin-input" placeholder="Discount percent" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} />
            <input className="admin-input" placeholder="Stock quantity" value={form.stockQuantity} onChange={(event) => setForm((current) => ({ ...current, stockQuantity: event.target.value }))} />
            <input className="admin-input" placeholder="Warranty months" value={form.warrantyMonths} onChange={(event) => setForm((current) => ({ ...current, warrantyMonths: event.target.value }))} />
            <input className="admin-input" placeholder="Return days" value={form.returnDays} onChange={(event) => setForm((current) => ({ ...current, returnDays: event.target.value }))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input className="admin-input" placeholder="Display size" value={form.displaySize} onChange={(event) => setForm((current) => ({ ...current, displaySize: event.target.value }))} />
            <input className="admin-input" placeholder="Display type" value={form.displayType} onChange={(event) => setForm((current) => ({ ...current, displayType: event.target.value }))} />
            <input className="admin-input" placeholder="Operating system" value={form.os} onChange={(event) => setForm((current) => ({ ...current, os: event.target.value }))} />
            <input className="admin-input" placeholder="Graphics card" value={form.graphicsCard} onChange={(event) => setForm((current) => ({ ...current, graphicsCard: event.target.value }))} />
            <input className="admin-input" placeholder="Battery note" value={form.battery} onChange={(event) => setForm((current) => ({ ...current, battery: event.target.value }))} />
            <input className="admin-input" placeholder="Weight" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} />
            <input className="admin-input" placeholder="SKU" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
            <input className="admin-input" placeholder="Serial number" value={form.serialNumber} onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))} />
          </div>

          <textarea className="admin-textarea" rows={3} placeholder="Warranty summary" value={form.warrantySummary} onChange={(event) => setForm((current) => ({ ...current, warrantySummary: event.target.value }))} />
          <textarea className="admin-textarea" rows={5} placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />

          <section className="admin-shell-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Store assignment</div>
                <p className="mt-2 text-sm text-slate-500">Choose the branches where this product should appear.</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{form.storeIds.length} selected</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {stores.map((store) => (
                <label key={store.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.storeIds.includes(store.id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        storeIds: event.target.checked
                          ? [...current.storeIds, store.id]
                          : current.storeIds.filter((id) => id !== store.id)
                      }))
                    }
                  />
                  <span>{store.name}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={form.available} onChange={(event) => setForm((current) => ({ ...current, available: event.target.checked }))} />
              Visible on website
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
              Featured on homepage
            </label>
          </div>

          <section className="admin-shell-muted p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Media gallery</div>
                <p className="mt-2 text-sm text-slate-500">Upload at least 1 product image and keep the gallery within 20 images total.</p>
                <p className="mt-2 text-xs text-slate-400">{imageCount}/{MAX_PRODUCT_IMAGES} images</p>
              </div>
              <label className={`admin-button-secondary cursor-pointer ${uploadingImages || imageCount >= MAX_PRODUCT_IMAGES ? "pointer-events-none opacity-60" : ""}`}>
                <ImagePlus className="mr-2 h-4 w-4" />
                {uploadingImages ? "Uploading..." : "Add images"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages || imageCount >= MAX_PRODUCT_IMAGES} />
              </label>
            </div>

            {selectedProduct ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {selectedProduct.images.map((image) => (
                  <div key={image.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-3">
                    <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-slate-100">
                      <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      className="admin-button-secondary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={uploadingImages || selectedProduct.images.length <= MIN_PRODUCT_IMAGES}
                      onClick={async () => {
                        await handleExistingImageRemove(image.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {draftImages.map((image) => (
                  <div key={image.publicId} className="rounded-[1.2rem] border border-slate-200 bg-white p-3">
                    <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-slate-100">
                      <img src={image.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      className="admin-button-secondary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={uploadingImages}
                      onClick={async () => {
                        await handleDraftImageRemove(image.publicId);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!draftImages.length ? (
                  <div className="col-span-full rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
                    Upload at least 1 image before creating this product listing.
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <button className="admin-button w-full" disabled={uploadingImages}>
            {selectedProduct ? "Update product" : "Create product"}
          </button>
        </form>
      </div>
    </div>
  );
}
