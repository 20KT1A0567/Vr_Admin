import axios from "axios";
import { ChangeEvent, FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Columns3, CopyPlus, Eye, EyeOff, Film, Filter, ImagePlus, Link2, PackageSearch, PencilLine, Plus, RefreshCcw, Save, Search, Sparkles, Star, Trash2, Upload, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import {
  commonFieldMeta,
  resolveProductCategoryTemplate,
  type CategoryCustomField,
  type CommonProductFieldKey,
  type ProductCategoryTemplate
} from "../utils/productCategorySchema";
import type { AdminProductListFilters, Category, Product, ProductBulkActionPayload } from "types";

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
  bestSeller: boolean;
  todayDeal: boolean;
  dealStartDate: string;
  dealEndDate: string;
  description: string;
  videoUrl: string;
  customAttributes: Record<string, string>;
};

type DraftProductImage = {
  imageUrl: string;
  publicId: string;
};

type ProductAvailabilityFilter = "ALL" | "VISIBLE" | "HIDDEN";
type ProductStockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type ProductColumnKey = "product" | "category" | "stores" | "price" | "stock" | "status" | "updated" | "actions";

type ProductListState = {
  search: string;
  brandIds: number[];
  categoryIds: number[];
  storeIds: number[];
  stockStates: ProductStockState[];
  availability: ProductAvailabilityFilter;
  featured: boolean;
  bestSeller: boolean;
  todayDeal: boolean;
  minPrice: number | null;
  maxPrice: number | null;
};

type SavedProductPreset = {
  id: string;
  label: string;
  filters: ProductListState;
};

type CategoryTreeNode = {
  key: string;
  label: string;
  categoryId?: number;
  children: CategoryTreeNode[];
};

type DeleteRequest =
  | { kind: "bulk"; count: number }
  | { kind: "single"; productId: number; title: string };

type ApiErrorEnvelope = {
  message?: string;
  data?: Record<string, string> | null;
};

const MIN_PRODUCT_IMAGES = 1;
const MAX_PRODUCT_IMAGES = 20;
const FILTER_PRESETS_STORAGE_KEY = "vrtech-admin-product-filter-presets";
const PRODUCT_COLUMNS_STORAGE_KEY = "vrtech-admin-product-columns";
const STOREFRONT_PREVIEW_BASE_URL = (import.meta.env.VITE_STOREFRONT_BASE_URL ?? "http://localhost:5173").replace(/\/+$/, "");

const defaultColumns: Record<ProductColumnKey, boolean> = {
  product: true,
  category: true,
  stores: true,
  price: true,
  stock: true,
  status: true,
  updated: true,
  actions: true
};

const defaultListState: ProductListState = {
  search: "",
  brandIds: [],
  categoryIds: [],
  storeIds: [],
  stockStates: [],
  availability: "ALL",
  featured: false,
  bestSeller: false,
  todayDeal: false,
  minPrice: null,
  maxPrice: null
};

const stockStateLabels: Record<ProductStockState, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock"
};

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
  bestSeller: false,
  todayDeal: false,
  dealStartDate: "",
  dealEndDate: "",
  description: "",
  videoUrl: "",
  customAttributes: {}
};

const fieldLabels: Record<string, string> = {
  title: "Product title",
  brandId: "Brand",
  categoryId: "Category",
  storeIds: "Store assignment",
  price: "Selling price",
  images: "Images"
};

function readStoredJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toggleNumberSelection(current: number[], value: number) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((left, right) => left - right);
}

function toggleStateSelection<T extends string>(current: T[], value: T) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function computePriceBounds(products: Product[]) {
  const prices = products
    .map((product) => Number(product.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (!prices.length) {
    return { min: 0, max: 100000 };
  }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices))
  };
}

function getEffectiveLowStockThreshold(product: Pick<Product, "lowStockThreshold">) {
  return product.lowStockThreshold ?? 5;
}

function getProductStockState(product: Pick<Product, "stockQuantity" | "lowStockThreshold">): ProductStockState {
  const quantity = Number(product.stockQuantity ?? 0);
  if (quantity <= 0) {
    return "OUT_OF_STOCK";
  }
  if (quantity <= getEffectiveLowStockThreshold(product)) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

function formatUpdatedAtLabel(value?: string) {
  if (!value) {
    return "Recently updated";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
}

function createPresetId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildCategoryTree(categories: Category[]) {
  const roots: CategoryTreeNode[] = [];

  for (const category of categories) {
    const parts = category.name
      .split(/[>/]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const normalizedParts = parts.length ? parts : [category.name];

    let currentNodes = roots;
    let currentPath = "";

    normalizedParts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = currentNodes.find((item) => item.key === currentPath);
      if (!node) {
        node = {
          key: currentPath,
          label: part,
          categoryId: undefined,
          children: []
        };
        currentNodes.push(node);
      }

      if (index === normalizedParts.length - 1) {
        node.categoryId = category.id;
      }

      currentNodes = node.children;
    });
  }

  const sortNodes = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
    nodes
      .map((node) => ({ ...node, children: sortNodes(node.children) }))
      .sort((left, right) => left.label.localeCompare(right.label));

  return sortNodes(roots);
}

function hasActiveProductFilters(filters: ProductListState, bounds: { min: number; max: number }) {
  return Boolean(
    filters.search.trim() ||
      filters.brandIds.length ||
      filters.categoryIds.length ||
      filters.storeIds.length ||
      filters.stockStates.length ||
      filters.availability !== "ALL" ||
      filters.featured ||
      filters.bestSeller ||
      filters.todayDeal ||
      (filters.minPrice != null && filters.minPrice > bounds.min) ||
      (filters.maxPrice != null && filters.maxPrice < bounds.max)
  );
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeDateTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
}

function toDateTimeInputValue(value?: string) {
  if (!value?.trim()) {
    return "";
  }

  return value.slice(0, 16);
}

function isTodayDealLive(product: Pick<Product, "todayDeal" | "dealStartDate" | "dealEndDate">) {
  if (!product.todayDeal) {
    return false;
  }

  const now = Date.now();
  const start = product.dealStartDate ? Date.parse(product.dealStartDate) : null;
  const end = product.dealEndDate ? Date.parse(product.dealEndDate) : null;

  if (start !== null && !Number.isNaN(start) && now < start) {
    return false;
  }

  if (end !== null && !Number.isNaN(end) && now > end) {
    return false;
  }

  return true;
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

function stringifyAttributeValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyAttributeValue(item)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeCustomAttributesInput(attributes: Record<string, string>) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(attributes)) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    if (trimmedKey && trimmedValue) {
      normalized[trimmedKey] = trimmedValue;
    }
  }

  return normalized;
}

function getTemplateCommonFieldKeys(template: ProductCategoryTemplate) {
  return new Set(template.commonGroups.flatMap((group) => group.fields));
}

function getTemplateCustomFieldKeys(template: ProductCategoryTemplate) {
  return new Set(template.customGroups.flatMap((group) => group.fields.map((field) => field.key)));
}

function applyCategoryFormShape(form: ProductFormState, categoryName?: string): ProductFormState {
  const template = resolveProductCategoryTemplate(categoryName);
  const allowedCommonFields = getTemplateCommonFieldKeys(template);
  const allowedCustomFields = getTemplateCustomFieldKeys(template);
  const nextCustomAttributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(form.customAttributes)) {
    if (allowedCustomFields.has(key) && value.trim()) {
      nextCustomAttributes[key] = value;
    }
  }

  const nextForm = { ...form, customAttributes: nextCustomAttributes };
  const commonFieldDefaults: Record<CommonProductFieldKey, string> = {
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
    weight: ""
  };

  (Object.keys(commonFieldDefaults) as CommonProductFieldKey[]).forEach((fieldKey) => {
    if (!allowedCommonFields.has(fieldKey)) {
      nextForm[fieldKey] = fieldKey === "storageType" ? "" : "";
      return;
    }

    if (!nextForm[fieldKey].trim()) {
      nextForm[fieldKey] = commonFieldDefaults[fieldKey];
    }
  });

  return nextForm;
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

  if (form.dealStartDate && form.dealEndDate) {
    const start = Date.parse(form.dealStartDate);
    const end = Date.parse(form.dealEndDate);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      return "Deal end date must be after deal start date";
    }
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
    bestSeller: product.bestSeller,
    todayDeal: product.todayDeal,
    dealStartDate: toDateTimeInputValue(product.dealStartDate),
    dealEndDate: toDateTimeInputValue(product.dealEndDate),
    description: product.description ?? "",
    videoUrl: product.videoUrl ?? "",
    customAttributes: Object.fromEntries(
      Object.entries(product.customAttributes ?? {}).map(([key, value]) => [key, stringifyAttributeValue(value)])
    )
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
    bestSeller: form.bestSeller,
    todayDeal: form.todayDeal,
    dealStartDate: normalizeDateTimeValue(form.dealStartDate),
    dealEndDate: normalizeDateTimeValue(form.dealEndDate),
    description: normalizeText(form.description),
    videoUrl: normalizeText(form.videoUrl),
    customAttributes: normalizeCustomAttributesInput(form.customAttributes),
    images: images?.map((image) => ({ imageUrl: image.imageUrl, publicId: image.publicId }))
  };
}

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function getProductTableSubtitle(product: Product) {
  const customAttributes = product.customAttributes ?? {};
  const fallbackDetail =
    product.processor ??
    (typeof customAttributes.accessoryType === "string" ? customAttributes.accessoryType : undefined) ??
    (typeof customAttributes.formFactor === "string" ? customAttributes.formFactor : undefined) ??
    (typeof customAttributes.resolution === "string" ? customAttributes.resolution : undefined) ??
    "Category-ready specs";

  return `${product.brandName ?? "No brand"} / ${fallbackDetail}`;
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: brands = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores-all"], queryFn: adminApi.getStores });

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ProductListState>(defaultListState);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [columns, setColumns] = useState<Record<ProductColumnKey, boolean>>(() => readStoredJson(PRODUCT_COLUMNS_STORAGE_KEY, defaultColumns));
  const [savedPresets, setSavedPresets] = useState<SavedProductPreset[]>(() => readStoredJson(FILTER_PRESETS_STORAGE_KEY, []));
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkPriceAdjustment, setBulkPriceAdjustment] = useState("");
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [draftImages, setDraftImages] = useState<DraftProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("url");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 100000 });
  const [hasCapturedBasePriceBounds, setHasCapturedBasePriceBounds] = useState(false);

  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        search: deferredSearch.trim()
      }));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [deferredSearch]);

  const productQueryParams = useMemo<AdminProductListFilters>(() => {
    const params: AdminProductListFilters = {};

    if (filters.search) {
      params.q = filters.search;
    }
    if (filters.brandIds.length) {
      params.brandIds = filters.brandIds;
    }
    if (filters.categoryIds.length) {
      params.categoryIds = filters.categoryIds;
    }
    if (filters.storeIds.length) {
      params.storeIds = filters.storeIds;
    }
    if (filters.stockStates.length) {
      params.stockStates = filters.stockStates;
    }
    if (filters.availability === "VISIBLE") {
      params.available = true;
    } else if (filters.availability === "HIDDEN") {
      params.available = false;
    }
    if (filters.featured) {
      params.featured = true;
    }
    if (filters.bestSeller) {
      params.bestSeller = true;
    }
    if (filters.todayDeal) {
      params.todayDeal = true;
    }
    if (filters.minPrice != null && filters.minPrice > priceBounds.min) {
      params.minPrice = filters.minPrice;
    }
    if (filters.maxPrice != null && filters.maxPrice < priceBounds.max) {
      params.maxPrice = filters.maxPrice;
    }

    return params;
  }, [filters, priceBounds.max, priceBounds.min]);

  const productsQuery = useQuery({
    queryKey: ["admin-products", productQueryParams],
    queryFn: () => adminApi.getProducts(productQueryParams),
    placeholderData: keepPreviousData
  });
  const products = productsQuery.data ?? [];

  const selectedProductQuery = useQuery({
    queryKey: ["admin-product", selectedProductId],
    queryFn: () => adminApi.getProduct(selectedProductId ?? 0),
    enabled: selectedProductId != null
  });

  const selectedProduct = selectedProductQuery.data ?? null;
  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === form.categoryId) ?? null,
    [categories, form.categoryId]
  );
  const categoryTemplate = useMemo(
    () => resolveProductCategoryTemplate(selectedCategory?.name),
    [selectedCategory?.name]
  );
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const activeFilterCount = [
    filters.search ? 1 : 0,
    filters.brandIds.length ? 1 : 0,
    filters.categoryIds.length ? 1 : 0,
    filters.storeIds.length ? 1 : 0,
    filters.stockStates.length ? 1 : 0,
    filters.availability !== "ALL" ? 1 : 0,
    filters.featured ? 1 : 0,
    filters.bestSeller ? 1 : 0,
    filters.todayDeal ? 1 : 0,
    filters.minPrice != null && filters.minPrice > priceBounds.min ? 1 : 0,
    filters.maxPrice != null && filters.maxPrice < priceBounds.max ? 1 : 0
  ].reduce((total, value) => total + value, 0);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    const nextBounds = computePriceBounds(products);
    if (!hasCapturedBasePriceBounds) {
      setPriceBounds(nextBounds);
      setHasCapturedBasePriceBounds(true);
      return;
    }

    if (!hasActiveProductFilters(filters, priceBounds) && (nextBounds.min !== priceBounds.min || nextBounds.max !== priceBounds.max)) {
      setPriceBounds(nextBounds);
    }
  }, [filters, hasCapturedBasePriceBounds, priceBounds.max, priceBounds.min, products]);

  useEffect(() => {
    setForm(selectedProduct ? applyCategoryFormShape(toForm(selectedProduct), selectedProduct.categoryName) : emptyForm);
  }, [selectedProduct]);

  useEffect(() => {
    const visibleIds = new Set(products.map((product) => product.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [products]);

  useEffect(() => {
    window.localStorage.setItem(PRODUCT_COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    window.localStorage.setItem(FILTER_PRESETS_STORAGE_KEY, JSON.stringify(savedPresets));
  }, [savedPresets]);

  const imageCount = selectedProduct ? selectedProduct.images.length : draftImages.length;
  const visibleProducts = products.filter((product) => product.available).length;
  const featuredProducts = products.filter((product) => product.featured).length;
  const lowStockProducts = products.filter((product) => getProductStockState(product) === "LOW_STOCK").length;

  function resetComposer() {
    setSelectedProductId(null);
    setForm(emptyForm);
    setDraftImages([]);
    setUploadingImages(false);
  }

  function openCreateComposer() {
    setSelectedProductId(null);
    setForm(emptyForm);
    setDraftImages([]);
    setUploadingImages(false);
  }

  function openEditComposer(productId: number) {
    setSelectedProductId(productId);
    setDraftImages([]);
  }

  async function refreshProductQueries(productId?: number | null) {
    await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    if (productId != null) {
      await queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
    }
  }

  function updateFilters(updater: (current: ProductListState) => ProductListState) {
    setFilters((current) => updater(current));
  }

  function clearFilters() {
    setSearchInput("");
    setFilters({
      ...defaultListState,
      minPrice: null,
      maxPrice: null
    });
    setExpandedCategoryKeys([]);
  }

  function toggleColumn(column: ProductColumnKey) {
    setColumns((current) => ({
      ...current,
      [column]: !current[column]
    }));
  }

  function toggleExpandedCategory(key: string) {
    setExpandedCategoryKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function confirmDeleteRequest() {
    const currentRequest = deleteRequest;
    if (!currentRequest) {
      return;
    }

    setDeleteRequest(null);

    if (currentRequest.kind === "bulk") {
      await executeBulkAction({ action: "DELETE", productIds: selectedIds }, "Selected products deleted");
      return;
    }

    try {
      await adminApi.deleteProduct(currentRequest.productId);
      toast.success("Product deleted");
      if (selectedProductId === currentRequest.productId) {
        resetComposer();
      }
      setSelectedIds((current) => current.filter((id) => id !== currentRequest.productId));
      await refreshProductQueries();
    } catch (error) {
      console.error("Failed to delete product", error);
      toast.error(getApiErrorMessage(error, "Failed to delete product"));
    }
  }

  function applyPreset(preset: SavedProductPreset) {
    setSearchInput(preset.filters.search);
    setFilters(preset.filters);
  }

  function handleSavePreset() {
    const suggestedLabel = filters.stockStates.includes("LOW_STOCK") ? "Low stock items" : "Custom preset";
    const label = window.prompt("Preset name", suggestedLabel)?.trim();
    if (!label) {
      return;
    }

    const nextPreset: SavedProductPreset = {
      id: createPresetId(),
      label,
      filters
    };

    setSavedPresets((current) => [nextPreset, ...current.filter((preset) => preset.label.toLowerCase() !== label.toLowerCase())]);
    toast.success(`Saved preset: ${label}`);
  }

  function deletePreset(id: string) {
    setSavedPresets((current) => current.filter((preset) => preset.id !== id));
    toast.success("Preset removed");
  }

  function toggleSelection(productId: number) {
    setSelectedIds((current) => toggleNumberSelection(current, productId));
  }

  function toggleSelectAllCurrent() {
    if (!products.length) {
      return;
    }

    setSelectedIds((current) => {
      const allSelected = products.every((product) => current.includes(product.id));
      if (allSelected) {
        return current.filter((id) => !products.some((product) => product.id === id));
      }
      const merged = new Set(current);
      products.forEach((product) => merged.add(product.id));
      return Array.from(merged.values()).sort((left, right) => left - right);
    });
  }

  async function executeBulkAction(payload: ProductBulkActionPayload, successMessage: string) {
    try {
      await adminApi.bulkProductAction(payload);
      toast.success(successMessage);
      if (payload.action === "DELETE") {
        setSelectedIds([]);
        if (selectedProductId != null && payload.productIds.includes(selectedProductId)) {
          resetComposer();
        }
      }
      await refreshProductQueries(selectedProductId);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Bulk action failed"));
    }
  }

  async function handleToggleFeatured(product: Product) {
    await executeBulkAction(
      { action: "SET_FEATURED", productIds: [product.id], enabled: !product.featured },
      product.featured ? "Removed from featured" : "Marked as featured"
    );
  }

  async function handleToggleTodayDeal(product: Product) {
    await executeBulkAction(
      { action: "SET_TODAY_DEAL", productIds: [product.id], enabled: !product.todayDeal },
      product.todayDeal ? "Removed from today deals" : "Added to today deals"
    );
  }

  async function handleToggleVisibility(product: Product) {
    await executeBulkAction(
      { action: "SET_VISIBILITY", productIds: [product.id], visible: !product.available },
      product.available ? "Product hidden" : "Product made visible"
    );
  }

  async function handleDuplicateProduct(productId: number) {
    try {
      const duplicated = await adminApi.duplicateProduct(productId);
      toast.success("Product duplicated");
      setSelectedProductId(duplicated.id);
      await refreshProductQueries(duplicated.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to duplicate product"));
    }
  }

  function handleCategoryChange(nextCategoryId: string) {
    const nextCategory = categories.find((category) => String(category.id) === nextCategoryId);

    setForm((current) =>
      applyCategoryFormShape(
        {
          ...current,
          categoryId: nextCategoryId
        },
        nextCategory?.name
      )
    );
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
        await refreshProductQueries(selectedProduct.id);
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
        await refreshProductQueries(selectedProduct.id);
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

  async function handleProductVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingVideo(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "products");
      setForm((current) => ({ ...current, videoUrl: uploaded.url }));
      toast.success("Product video uploaded");
    } catch {
      toast.error("Failed to upload product video");
    } finally {
      setUploadingVideo(false);
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
      await refreshProductQueries(selectedProduct?.id);
    } catch (error) {
      console.error("Failed to save product", error);
      toast.error(getApiErrorMessage(error, selectedProduct ? "Failed to update product" : "Failed to create product"));
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProduct) {
      return;
    }
    setDeleteRequest({ kind: "single", productId: selectedProduct.id, title: selectedProduct.title });
  }

  async function handleExistingImageRemove(imageId: number) {
    if (!selectedProduct) {
      return;
    }

    try {
      await adminApi.deleteProductImage(selectedProduct.id, imageId);
      toast.success("Image removed");
      await refreshProductQueries(selectedProduct.id);
    } catch (error) {
      console.error("Failed to delete product image", error);
      toast.error(getApiErrorMessage(error, "Failed to remove image"));
    }
  }

  function updateCustomAttribute(fieldKey: string, value: string) {
    setForm((current) => ({
      ...current,
      customAttributes: {
        ...current.customAttributes,
        [fieldKey]: value
      }
    }));
  }

  function renderCommonField(fieldKey: CommonProductFieldKey) {
    const field = commonFieldMeta[fieldKey];

    if (field.type === "select") {
      return (
        <select
          key={fieldKey}
          className="admin-select"
          value={form[fieldKey]}
          onChange={(event) => setForm((current) => ({ ...current, [fieldKey]: event.target.value }))}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        key={fieldKey}
        className="admin-input"
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        value={form[fieldKey]}
        onChange={(event) => setForm((current) => ({ ...current, [fieldKey]: event.target.value }))}
      />
    );
  }

  function renderCustomField(field: CategoryCustomField) {
    const value = form.customAttributes[field.key] ?? "";

    if (field.type === "textarea") {
      return (
        <textarea
          key={field.key}
          className="admin-textarea"
          rows={field.rows ?? 3}
          placeholder={field.placeholder ?? field.label}
          value={value}
          onChange={(event) => updateCustomAttribute(field.key, event.target.value)}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          key={field.key}
          className="admin-select"
          value={value}
          onChange={(event) => updateCustomAttribute(field.key, event.target.value)}
        >
          <option value="">{field.label}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        key={field.key}
        className="admin-input"
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder ?? field.label}
        value={value}
        onChange={(event) => updateCustomAttribute(field.key, event.target.value)}
      />
    );
  }

  const effectiveMinPrice = filters.minPrice ?? priceBounds.min;
  const effectiveMaxPrice = filters.maxPrice ?? priceBounds.max;
  const allCurrentSelected = products.length > 0 && products.every((product) => selectedIds.includes(product.id));

  function renderCategoryNode(node: CategoryTreeNode, depth = 0): JSX.Element {
    const isExpanded = expandedCategoryKeys.includes(node.key);
    const isLeaf = node.children.length === 0;
    const isSelected = node.categoryId != null && filters.categoryIds.includes(node.categoryId);

    return (
      <div key={node.key} className="space-y-1">
        <div
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {!isLeaf ? (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => toggleExpandedCategory(node.key)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}

          <label className="flex flex-1 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={isSelected}
              disabled={node.categoryId == null}
              onChange={() => {
                if (node.categoryId == null) {
                  return;
                }
                updateFilters((current) => ({
                  ...current,
                  categoryIds: toggleNumberSelection(current.categoryIds, node.categoryId!)
                }));
              }}
            />
            <span>{node.label}</span>
          </label>
        </div>

        {!isLeaf && isExpanded ? (
          <div className="space-y-1">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Products</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">Industrial catalog operations</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage large product volumes with stronger filters, cleaner visibility controls, and a focused editor that stays out of the table workspace until you need it.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-end gap-3">
              <ActionButton variant="secondary" icon={<RefreshCcw className="h-4 w-4" />} onClick={() => refreshProductQueries(selectedProductId)}>
                Refresh data
              </ActionButton>
              <ActionButton icon={<Plus className="h-4 w-4" />} onClick={openCreateComposer}>
                Add product
              </ActionButton>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="admin-shell-muted p-4">
                <div className="admin-section-label">Shown</div>
                <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{products.length}</div>
              </article>
              <article className="admin-shell-muted p-4">
                <div className="admin-section-label">Visible</div>
                <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{visibleProducts}</div>
              </article>
              <article className="admin-shell-muted p-4">
                <div className="admin-section-label">Featured</div>
                <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{featuredProducts}</div>
              </article>
              <article className="admin-shell-muted p-4">
                <div className="admin-section-label">Low stock</div>
                <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{lowStockProducts}</div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-4">
          <div className="sticky top-[88px] z-20 space-y-4">
            <div className="admin-shell p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="admin-pill">Advanced filters</div>
                  <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">API-driven product workbench</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Multi-select filters, price controls, saved presets, and column visibility keep the product team in a fast action loop.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">
                    {products.length} results
                  </span>
                  <button type="button" className="admin-button-secondary !px-4 !py-2.5" onClick={handleSavePreset}>
                    <Save className="mr-2 h-4 w-4" />
                    Save preset
                  </button>
                  <details className="relative">
                    <summary className="admin-button-secondary !px-4 !py-2.5 list-none cursor-pointer">
                      <Columns3 className="mr-2 h-4 w-4" />
                      Columns
                    </summary>
                    <div className="absolute right-0 top-[calc(100%+0.6rem)] z-30 w-64 rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Visible fields</div>
                      <div className="mt-3 space-y-2">
                        {(Object.keys(columns) as ProductColumnKey[]).map((column) => (
                          <label key={column} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={columns[column]}
                              disabled={column === "product" || column === "actions"}
                              onChange={() => toggleColumn(column)}
                            />
                            <span className="capitalize">{column}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                  {activeFilterCount ? (
                    <button type="button" className="admin-button-secondary !px-4 !py-2.5" onClick={clearFilters}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="admin-input pl-11"
                    placeholder="Search title, SKU, serial, processor, brand..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>

                <details className="relative">
                  <summary className="admin-select flex list-none cursor-pointer items-center justify-between">
                    <span>{filters.brandIds.length ? `${filters.brandIds.length} brand${filters.brandIds.length === 1 ? "" : "s"}` : "Brands"}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </summary>
                  <div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-full min-w-[260px] rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Brand filter</div>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {brands.map((brand) => (
                        <label key={brand.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={filters.brandIds.includes(brand.id)}
                            onChange={() =>
                              updateFilters((current) => ({
                                ...current,
                                brandIds: toggleNumberSelection(current.brandIds, brand.id)
                              }))
                            }
                          />
                          <span>{brand.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>

                <details className="relative">
                  <summary className="admin-select flex list-none cursor-pointer items-center justify-between">
                    <span>{filters.categoryIds.length ? `${filters.categoryIds.length} categor${filters.categoryIds.length === 1 ? "y" : "ies"}` : "Categories"}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </summary>
                  <div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-[320px] rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category tree</div>
                    <div className="mt-3 max-h-80 overflow-y-auto pr-1">
                      {categoryTree.map((node) => renderCategoryNode(node))}
                    </div>
                  </div>
                </details>

                <details className="relative">
                  <summary className="admin-select flex list-none cursor-pointer items-center justify-between">
                    <span>{filters.storeIds.length ? `${filters.storeIds.length} store${filters.storeIds.length === 1 ? "" : "s"}` : "Stores"}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </summary>
                  <div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-[320px] rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Store coverage</div>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {stores.map((store) => (
                        <label key={store.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={filters.storeIds.includes(store.id)}
                            onChange={() =>
                              updateFilters((current) => ({
                                ...current,
                                storeIds: toggleNumberSelection(current.storeIds, store.id)
                              }))
                            }
                          />
                          <span>{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live updates</div>
                  <div className="mt-2 flex items-center gap-2 text-slate-700">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    {productsQuery.isFetching ? "Refreshing products..." : "Filters update without page reload"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.8fr_1fr]">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Price range</div>
                      <div className="mt-1 text-sm text-slate-600">Fine-tune results without leaving the table.</div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500"
                      onClick={() => updateFilters((current) => ({ ...current, minPrice: null, maxPrice: null }))}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      className="admin-input"
                      type="number"
                      min={priceBounds.min}
                      max={effectiveMaxPrice}
                      value={effectiveMinPrice}
                      onChange={(event) =>
                        updateFilters((current) => {
                          const nextValue = Number(event.target.value || priceBounds.min);
                          return {
                            ...current,
                            minPrice: Math.min(nextValue, current.maxPrice ?? priceBounds.max)
                          };
                        })
                      }
                    />
                    <input
                      className="admin-input"
                      type="number"
                      min={effectiveMinPrice}
                      max={priceBounds.max}
                      value={effectiveMaxPrice}
                      onChange={(event) =>
                        updateFilters((current) => {
                          const nextValue = Number(event.target.value || priceBounds.max);
                          return {
                            ...current,
                            maxPrice: Math.max(nextValue, current.minPrice ?? priceBounds.min)
                          };
                        })
                      }
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={effectiveMinPrice}
                      onChange={(event) =>
                        updateFilters((current) => ({
                          ...current,
                          minPrice: Math.min(Number(event.target.value), current.maxPrice ?? priceBounds.max)
                        }))
                      }
                      className="w-full accent-emerald-600"
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={effectiveMaxPrice}
                      onChange={(event) =>
                        updateFilters((current) => ({
                          ...current,
                          maxPrice: Math.max(Number(event.target.value), current.minPrice ?? priceBounds.min)
                        }))
                      }
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stock health</div>
                  <div className="mt-3 space-y-2">
                    {(Object.keys(stockStateLabels) as ProductStockState[]).map((stockState) => {
                      const selected = filters.stockStates.includes(stockState);
                      return (
                        <button
                          key={stockState}
                          type="button"
                          className={selected ? "admin-chip-active w-full justify-between" : "admin-chip w-full justify-between"}
                          onClick={() =>
                            updateFilters((current) => ({
                              ...current,
                              stockStates: toggleStateSelection(current.stockStates, stockState)
                            }))
                          }
                        >
                          <span>{stockStateLabels[stockState]}</span>
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status & tags</div>
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Visibility</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["ALL", "VISIBLE", "HIDDEN"] as ProductAvailabilityFilter[]).map((availability) => (
                        <button
                          key={availability}
                          type="button"
                          className={filters.availability === availability ? "admin-chip-active" : "admin-chip"}
                          onClick={() => updateFilters((current) => ({ ...current, availability }))}
                        >
                          {availability === "ALL" ? "All" : availability === "VISIBLE" ? "Visible" : "Hidden"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className={filters.featured ? "admin-chip-active" : "admin-chip"} onClick={() => updateFilters((current) => ({ ...current, featured: !current.featured }))}>
                        Featured
                      </button>
                      <button type="button" className={filters.bestSeller ? "admin-chip-active" : "admin-chip"} onClick={() => updateFilters((current) => ({ ...current, bestSeller: !current.bestSeller }))}>
                        Best Seller
                      </button>
                      <button type="button" className={filters.todayDeal ? "admin-chip-active" : "admin-chip"} onClick={() => updateFilters((current) => ({ ...current, todayDeal: !current.todayDeal }))}>
                        Today Deal
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {filters.search ? (
                  <button type="button" onClick={() => setSearchInput("")} className="admin-chip">
                    Search: {filters.search} <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.brandIds.map((brandId) => (
                  <button
                    key={brandId}
                    type="button"
                    onClick={() =>
                      updateFilters((current) => ({
                        ...current,
                        brandIds: current.brandIds.filter((value) => value !== brandId)
                      }))
                    }
                    className="admin-chip"
                  >
                    Brand: {brands.find((brand) => brand.id === brandId)?.name ?? brandId} <span className="text-slate-400">&times;</span>
                  </button>
                ))}
                {filters.categoryIds.map((categoryId) => (
                  <button
                    key={categoryId}
                    type="button"
                    onClick={() =>
                      updateFilters((current) => ({
                        ...current,
                        categoryIds: current.categoryIds.filter((value) => value !== categoryId)
                      }))
                    }
                    className="admin-chip"
                  >
                    Category: {categories.find((category) => category.id === categoryId)?.name ?? categoryId} <span className="text-slate-400">&times;</span>
                  </button>
                ))}
                {filters.storeIds.map((storeId) => (
                  <button
                    key={storeId}
                    type="button"
                    onClick={() =>
                      updateFilters((current) => ({
                        ...current,
                        storeIds: current.storeIds.filter((value) => value !== storeId)
                      }))
                    }
                    className="admin-chip"
                  >
                    Store: {stores.find((store) => store.id === storeId)?.name ?? storeId} <span className="text-slate-400">&times;</span>
                  </button>
                ))}
                {filters.stockStates.map((stockState) => (
                  <button
                    key={stockState}
                    type="button"
                    onClick={() =>
                      updateFilters((current) => ({
                        ...current,
                        stockStates: current.stockStates.filter((value) => value !== stockState)
                      }))
                    }
                    className="admin-chip"
                  >
                    Stock: {stockStateLabels[stockState]} <span className="text-slate-400">&times;</span>
                  </button>
                ))}
                {filters.availability !== "ALL" ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, availability: "ALL" }))} className="admin-chip">
                    Status: {filters.availability === "VISIBLE" ? "Visible" : "Hidden"} <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.featured ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, featured: false }))} className="admin-chip">
                    Featured <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.bestSeller ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, bestSeller: false }))} className="admin-chip">
                    Best Seller <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.todayDeal ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, todayDeal: false }))} className="admin-chip">
                    Today Deal <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.minPrice != null && filters.minPrice > priceBounds.min ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, minPrice: null }))} className="admin-chip">
                    Min: {formatCurrency(filters.minPrice)} <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
                {filters.maxPrice != null && filters.maxPrice < priceBounds.max ? (
                  <button type="button" onClick={() => updateFilters((current) => ({ ...current, maxPrice: null }))} className="admin-chip">
                    Max: {formatCurrency(filters.maxPrice)} <span className="text-slate-400">&times;</span>
                  </button>
                ) : null}
              </div>

              {savedPresets.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Saved presets</div>
                  {savedPresets.map((preset) => (
                    <div key={preset.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                      <button type="button" onClick={() => applyPreset(preset)}>{preset.label}</button>
                      <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => deletePreset(preset.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedIds.length ? (
              <div className="admin-shell p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="admin-pill">Bulk actions</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="admin-button-danger !px-4 !py-2.5"
                      onClick={() => setDeleteRequest({ kind: "bulk", count: selectedIds.length })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </button>
                    <button type="button" className="admin-button-secondary !px-4 !py-2.5" onClick={() => executeBulkAction({ action: "SET_VISIBILITY", productIds: selectedIds, visible: true }, "Selected products are visible")}>
                      <Eye className="mr-2 h-4 w-4" />
                      Show
                    </button>
                    <button type="button" className="admin-button-secondary !px-4 !py-2.5" onClick={() => executeBulkAction({ action: "SET_VISIBILITY", productIds: selectedIds, visible: false }, "Selected products are hidden")}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide
                    </button>
                    <select className="admin-select !w-[210px]" value={bulkCategoryId} onChange={(event) => setBulkCategoryId(event.target.value)}>
                      <option value="">Assign category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="admin-button-secondary !px-4 !py-2.5"
                      onClick={async () => {
                        if (!bulkCategoryId) {
                          toast.error("Choose a category first");
                          return;
                        }
                        await executeBulkAction(
                          { action: "ASSIGN_CATEGORY", productIds: selectedIds, categoryId: Number(bulkCategoryId) },
                          "Category assigned to selected products"
                        );
                        setBulkCategoryId("");
                      }}
                    >
                      Apply category
                    </button>
                    <input
                      className="admin-input !w-[160px]"
                      placeholder="Price +/- %"
                      value={bulkPriceAdjustment}
                      onChange={(event) => setBulkPriceAdjustment(event.target.value)}
                    />
                    <button
                      type="button"
                      className="admin-button-secondary !px-4 !py-2.5"
                      onClick={async () => {
                        const parsed = Number(bulkPriceAdjustment);
                        if (!Number.isFinite(parsed)) {
                          toast.error("Enter a valid price percentage");
                          return;
                        }
                        await executeBulkAction(
                          { action: "ADJUST_PRICE_PERCENT", productIds: selectedIds, priceAdjustmentPercent: parsed },
                          "Price updated for selected products"
                        );
                        setBulkPriceAdjustment("");
                      }}
                    >
                      Update price
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="admin-shell overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product library</div>
                <div className="mt-1 text-sm text-slate-500">Quick operations, bulk edits, and cleaner visibility into stock health.</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                {activeFilterCount ? <span>{activeFilterCount} active filters</span> : <span>All products</span>}
                {productsQuery.isFetching ? <span className="admin-badge-sky">Syncing…</span> : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="admin-table-head">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allCurrentSelected} onChange={toggleSelectAllCurrent} />
                    </th>
                    {columns.product ? <th className="px-5 py-3">Product</th> : null}
                    {columns.category ? <th className="px-3 py-3">Category</th> : null}
                    {columns.stores ? <th className="px-3 py-3">Stores</th> : null}
                    {columns.price ? <th className="px-3 py-3">Price</th> : null}
                    {columns.stock ? <th className="px-3 py-3">Stock</th> : null}
                    {columns.status ? <th className="px-3 py-3">Status</th> : null}
                    {columns.updated ? <th className="px-3 py-3">Updated</th> : null}
                    {columns.actions ? <th className="px-5 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stock = Number(product.stockQuantity ?? 0);
                    const dealLive = isTodayDealLive(product);
                    const stockState = getProductStockState(product);
                    const stockClass = stockState === "OUT_OF_STOCK"
                      ? "bg-rose-50 text-rose-700"
                      : stockState === "LOW_STOCK"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700";

                    return (
                      <tr key={product.id} className={`admin-table-row ${selectedProductId === product.id ? "bg-emerald-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                          />
                        </td>
                        {columns.product ? (
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                                {product.images[0]?.imageUrl ? (
                                  <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                                ) : (
                                  <PackageSearch className="h-4 w-4 text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">{product.title}</div>
                                <div className="mt-1 truncate text-xs text-slate-400">{getProductTableSubtitle(product)}</div>
                              </div>
                            </div>
                          </td>
                        ) : null}
                        {columns.category ? <td className="px-3 py-3 text-slate-600">{product.categoryName ?? "Unassigned"}</td> : null}
                        {columns.stores ? (
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {product.stores.slice(0, 2).map((store) => (
                                <span key={store.id} className="admin-chip">{store.name}</span>
                              ))}
                              {product.stores.length > 2 ? <span className="admin-chip">+{product.stores.length - 2} more</span> : null}
                            </div>
                          </td>
                        ) : null}
                        {columns.price ? (
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-900">{formatCurrency(product.price)}</div>
                            {product.originalPrice && product.originalPrice > product.price ? (
                              <div className="mt-1 text-xs text-slate-400 line-through">{formatCurrency(product.originalPrice)}</div>
                            ) : null}
                          </td>
                        ) : null}
                        {columns.stock ? (
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <span className={`admin-badge ${stockClass}`}>{stock} units</span>
                              <div className="text-xs text-slate-400">Threshold {getEffectiveLowStockThreshold(product)}</div>
                            </div>
                          </td>
                        ) : null}
                        {columns.status ? (
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={product.available ? "admin-badge-green" : "admin-badge-slate"}>
                                {product.available ? (
                                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />Visible</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" />Hidden</span>
                                )}
                              </span>
                              {product.featured ? (
                                <span className="admin-badge-amber inline-flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Featured
                                </span>
                              ) : null}
                              {product.bestSeller ? (
                                <span className="admin-badge-violet inline-flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  Best Seller
                                </span>
                              ) : null}
                              {product.todayDeal ? (
                                <span className={dealLive ? "admin-badge-rose" : "admin-badge-sky"}>
                                  {dealLive ? "Today Deal" : "Deal Scheduled"}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                        {columns.updated ? <td className="px-3 py-3 text-sm text-slate-500">{formatUpdatedAtLabel(product.updatedAt)}</td> : null}
                        {columns.actions ? (
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              <a
                                href={`${STOREFRONT_PREVIEW_BASE_URL}/products/${product.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-icon-button"
                                aria-label="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                              <button type="button" className="admin-icon-button" onClick={() => handleToggleFeatured(product)} aria-label="Toggle featured">
                                <Sparkles className={`h-4 w-4 ${product.featured ? "text-amber-500" : ""}`} />
                              </button>
                              <button type="button" className="admin-icon-button" onClick={() => handleToggleTodayDeal(product)} aria-label="Toggle today deal">
                                <Zap className={`h-4 w-4 ${product.todayDeal ? "text-rose-500" : ""}`} />
                              </button>
                              <button type="button" className="admin-icon-button" onClick={() => handleToggleVisibility(product)} aria-label="Toggle visibility">
                                {product.available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button type="button" className="admin-icon-button" onClick={() => handleDuplicateProduct(product.id)} aria-label="Duplicate">
                                <CopyPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-button"
                                onClick={() => openEditComposer(product.id)}
                                aria-label="Edit"
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-button-danger"
                                onClick={() => setDeleteRequest({ kind: "single", productId: product.id, title: product.title })}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                  {!products.length ? (
                    <tr>
                      <td colSpan={1 + (Object.values(columns).filter(Boolean).length)} className="px-6 py-16 text-center text-sm text-slate-400">
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

          <section className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Catalog basics</div>
              <p className="mt-2 text-sm text-slate-500">Set the identity for this listing before you fill the category-specific specification blocks.</p>
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
              <select className="admin-select" value={form.categoryId} onChange={(event) => handleCategoryChange(event.target.value)}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="admin-shell-muted p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category-driven fields</div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{categoryTemplate.label}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">{categoryTemplate.intro}</p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {selectedCategory?.name ?? "Choose category"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {categoryTemplate.commonGroups.map((group) => (
                <div key={group.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{group.title}</h4>
                      {group.description ? <p className="mt-1 text-xs text-slate-500">{group.description}</p> : null}
                    </div>
                    <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Common specs
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {group.fields.map((fieldKey) => renderCommonField(fieldKey))}
                  </div>
                </div>
              ))}

              {categoryTemplate.customGroups.map((group) => (
                <div key={group.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{group.title}</h4>
                      {group.description ? <p className="mt-1 text-xs text-slate-500">{group.description}</p> : null}
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Website detail blocks
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {group.fields.map((field) => renderCustomField(field))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Commercial settings</div>
              <p className="mt-2 text-sm text-slate-500">Control pricing, condition, stock, warranty, and internal identifiers.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
              <input className="admin-input" placeholder="SKU" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
              <input className="admin-input" placeholder="Serial number" value={form.serialNumber} onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))} />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Merchandising flags</div>
              <p className="mt-2 text-sm text-slate-500">Choose which products should be highlighted as best sellers or surfaced in the today deals experience.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.bestSeller}
                  onChange={(event) => setForm((current) => ({ ...current, bestSeller: event.target.checked }))}
                />
                Mark as best seller
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.todayDeal}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      todayDeal: event.target.checked,
                      dealStartDate: event.target.checked ? current.dealStartDate : "",
                      dealEndDate: event.target.checked ? current.dealEndDate : ""
                    }))
                  }
                />
                Include in today deals
              </label>
            </div>

            <div className={`grid gap-4 md:grid-cols-2 ${form.todayDeal ? "" : "opacity-60"}`}>
              <input
                className="admin-input"
                type="datetime-local"
                placeholder="Deal start date"
                value={form.dealStartDate}
                disabled={!form.todayDeal}
                onChange={(event) => setForm((current) => ({ ...current, dealStartDate: event.target.value }))}
              />
              <input
                className="admin-input"
                type="datetime-local"
                placeholder="Deal end date"
                value={form.dealEndDate}
                disabled={!form.todayDeal}
                onChange={(event) => setForm((current) => ({ ...current, dealEndDate: event.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Storefront copy</div>
              <p className="mt-2 text-sm text-slate-500">These long-form fields feed warranty messaging and the main product narrative on the website.</p>
            </div>

            <textarea className="admin-textarea" rows={3} placeholder="Warranty summary" value={form.warrantySummary} onChange={(event) => setForm((current) => ({ ...current, warrantySummary: event.target.value }))} />
            <textarea className="admin-textarea" rows={5} placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </section>

          <section className="admin-shell-muted p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Product video</div>
                <p className="mt-1 text-xs text-slate-500">Optional demo or unboxing video shown on the product detail page.</p>
              </div>
              <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setVideoInputMode("upload")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${videoInputMode === "upload" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setVideoInputMode("url")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${videoInputMode === "url" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Paste URL
                </button>
              </div>
            </div>

            {videoInputMode === "upload" ? (
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 transition hover:border-slate-400 ${uploadingVideo ? "pointer-events-none opacity-60" : ""}`}>
                <Film className="h-5 w-5 text-slate-400" />
                {uploadingVideo ? "Uploading video…" : form.videoUrl ? "Replace video file" : "Click to upload video (MP4, WebM)"}
                <input type="file" accept="video/*" className="hidden" onChange={handleProductVideoUpload} disabled={uploadingVideo} />
              </label>
            ) : (
              <input
                className="admin-input"
                placeholder="https://example.com/product-demo.mp4"
                value={form.videoUrl}
                onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
              />
            )}

            {form.videoUrl ? (
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs border border-slate-200">
                <Film className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate font-medium text-slate-700">{form.videoUrl}</span>
                <button
                  type="button"
                  className="ml-auto shrink-0 text-red-500 hover:text-red-700"
                  onClick={() => setForm((current) => ({ ...current, videoUrl: "" }))}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </section>

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

      <ConfirmDialog
        open={deleteRequest != null}
        onClose={() => setDeleteRequest(null)}
        onConfirm={confirmDeleteRequest}
        title={
          deleteRequest?.kind === "bulk"
            ? `Delete ${deleteRequest.count} selected product${deleteRequest.count === 1 ? "" : "s"}?`
            : deleteRequest
            ? `Delete ${deleteRequest.title}?`
            : "Delete product?"
        }
        description={
          deleteRequest?.kind === "bulk"
            ? "This permanently removes the selected products from the catalog and storefront listings."
            : "This permanently removes the product from the catalog and storefront listings."
        }
        confirmLabel={deleteRequest?.kind === "bulk" ? "Delete products" : "Delete product"}
        tone="danger"
      />
    </div>
  );
}
