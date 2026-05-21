import axios from "axios";
import { Chip, Dialog, DialogActions, DialogContent, IconButton, Tooltip } from "@mui/material";
import { ChangeEvent, FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Boxes, Check, ChevronDown, ChevronRight, Columns3, CopyPlus, Download, Eye, EyeOff, Film, Filter, Gauge, History, ImagePlus, IndianRupee, LayoutGrid, Link2, PackagePlus, PackageSearch, Percent, PencilLine, RefreshCcw, Save, Search, ShoppingBag, Sparkles, Star, Trash2, Upload, X, Zap, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { PageHeader } from "components/admin/PageHeader";
import { ProductAuditDrawer } from "components/admin/ProductAuditDrawer";
import { SlideOverDrawer } from "components/admin/SlideOverDrawer";
import { StatCard } from "components/admin/StatCard";
import {
  commonFieldMeta,
  resolveProductCategoryTemplate,
  type CategoryCustomField,
  type CommonProductFieldKey,
  type ProductCategoryTemplate
} from "../utils/productCategorySchema";
import type { AdminProductListFilters, Category, Product, ProductBulkActionPayload } from "types";
import { cn } from "utils/cn";

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
  productStatus: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  price: string;
  originalPrice: string;
  discountPercent: string;
  stockQuantity: string;
  lowStockThreshold: string;
  available: boolean;
  featured: boolean;
  bestSeller: boolean;
  todayDeal: boolean;
  dealStartDate: string;
  dealEndDate: string;
  description: string;
  videoUrl: string;
  displayOrder: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  hsnCode: string;
  gstRatePercent: string;
  taxable: boolean;
  customAttributes: Record<string, string>;
};

type DraftProductImage = {
  imageUrl: string;
  publicId: string;
};

type ProductAvailabilityFilter = "ALL" | "VISIBLE" | "HIDDEN";
type ProductStockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type ProductTab = "ALL" | "LIVE" | "FEATURED" | "LOW_STOCK" | "OUT_OF_STOCK";
type ProductColumnKey = "product" | "category" | "stores" | "price" | "stock" | "status" | "featured" | "updated" | "actions";
type ProductViewMode = "table" | "grid";

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

type CategoryTreeNode = {
  key: string;
  label: string;
  categoryId?: number;
  children: CategoryTreeNode[];
};

type DeleteRequest =
  | { kind: "bulk"; count: number }
  | { kind: "single"; productId: number; title: string };

type QuickEditState = {
  product: Product;
  price: string;
  originalPrice: string;
  discountPercent: string;
  stockQuantity: string;
  available: boolean;
  featured: boolean;
  bestSeller: boolean;
  todayDeal: boolean;
};

type ApiErrorEnvelope = {
  message?: string;
  data?: Record<string, string> | null;
};

const MIN_PRODUCT_IMAGES = 1;
const MAX_PRODUCT_IMAGES = 20;
const STOREFRONT_PREVIEW_BASE_URL = (import.meta.env.VITE_STOREFRONT_BASE_URL ?? "http://localhost:5173").replace(/\/+$/, "");

const defaultColumns: Record<ProductColumnKey, boolean> = {
  product: true,
  category: true,
  stores: true,
  price: true,
  stock: true,
  status: true,
  featured: true,
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
  productStatus: "ACTIVE",
  price: "",
  originalPrice: "",
  discountPercent: "",
  stockQuantity: "1",
  lowStockThreshold: "5",
  available: true,
  featured: false,
  bestSeller: false,
  todayDeal: false,
  dealStartDate: "",
  dealEndDate: "",
  description: "",
  videoUrl: "",
  displayOrder: "0",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  hsnCode: "",
  gstRatePercent: "",
  taxable: true,
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
    [form.stockQuantity, "stock quantity"],
    [form.lowStockThreshold, "low stock threshold"],
    [form.displayOrder, "display order"]
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
    productStatus: product.productStatus ?? "ACTIVE",
    price: String(product.price ?? ""),
    originalPrice: String(product.originalPrice ?? ""),
    discountPercent: String(product.discountPercent ?? ""),
    stockQuantity: String(product.stockQuantity ?? "1"),
    lowStockThreshold: String(product.lowStockThreshold ?? "5"),
    available: product.available,
    featured: product.featured,
    bestSeller: product.bestSeller,
    todayDeal: product.todayDeal,
    dealStartDate: toDateTimeInputValue(product.dealStartDate),
    dealEndDate: toDateTimeInputValue(product.dealEndDate),
    description: product.description ?? "",
    videoUrl: product.videoUrl ?? "",
    displayOrder: String(product.displayOrder ?? "0"),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    seoKeywords: product.seoKeywords ?? "",
    hsnCode: product.hsnCode ?? "",
    gstRatePercent: String(product.gstRatePercent ?? ""),
    taxable: product.taxable ?? true,
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
    productStatus: form.productStatus,
    price: parseDecimalInput(form.price),
    originalPrice: parseDecimalInput(form.originalPrice),
    discountPercent: parseIntegerInput(form.discountPercent),
    stockQuantity: parseIntegerInput(form.stockQuantity),
    lowStockThreshold: parseIntegerInput(form.lowStockThreshold),
    available: form.available,
    featured: form.featured,
    bestSeller: form.bestSeller,
    todayDeal: form.todayDeal,
    dealStartDate: normalizeDateTimeValue(form.dealStartDate),
    dealEndDate: normalizeDateTimeValue(form.dealEndDate),
    displayOrder: parseIntegerInput(form.displayOrder),
    description: normalizeText(form.description),
    videoUrl: normalizeText(form.videoUrl),
    seoTitle: normalizeText(form.seoTitle),
    seoDescription: normalizeText(form.seoDescription),
    seoKeywords: normalizeText(form.seoKeywords),
    hsnCode: normalizeText(form.hsnCode),
    gstRatePercent: parseDecimalInput(form.gstRatePercent),
    taxable: form.taxable,
    customAttributes: normalizeCustomAttributesInput(form.customAttributes),
    images: images?.map((image) => ({ imageUrl: image.imageUrl, publicId: image.publicId }))
  };
}

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function formatNumber(value: number) {
  return Number(value).toLocaleString("en-IN");
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

import { motion } from "framer-motion";

export function ProductsPage({ startComposer = false }: { startComposer?: boolean }) {
  const queryClient = useQueryClient();
  const { data: brands = [] } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores-all"], queryFn: adminApi.getStores });

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ProductListState>(defaultListState);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [productTab, setProductTab] = useState<ProductTab>("ALL");
  const [columns, setColumns] = useState<Record<ProductColumnKey, boolean>>(defaultColumns);
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkPriceAdjustment, setBulkPriceAdjustment] = useState("");
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [draftImages, setDraftImages] = useState<DraftProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("url");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 100000 });
  const [hasCapturedBasePriceBounds, setHasCapturedBasePriceBounds] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProductViewMode>("table");
  const [auditTarget, setAuditTarget] = useState<{ id: number; title: string } | null>(null);
  const autoOpenedComposerRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const selectedProductQuery = useQuery({
    queryKey: ["admin-product", selectedProductId],
    queryFn: () => adminApi.getProduct(selectedProductId ?? 0),
    enabled: selectedProductId != null
  });
  const selectedProduct = selectedProductQuery.data ?? null;

  useEffect(() => {
    if (products.length > 0 && !hasCapturedBasePriceBounds) {
      const bounds = computePriceBounds(products);
      setPriceBounds(bounds);
      setHasCapturedBasePriceBounds(true);
    }
  }, [products, hasCapturedBasePriceBounds]);

  useEffect(() => {
    if (startComposer && !autoOpenedComposerRef.current) {
      autoOpenedComposerRef.current = true;
      setComposerOpen(true);
    }
  }, [startComposer]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const activeFilterCount = useMemo(() => (hasActiveProductFilters(filters, priceBounds) ? 1 : 0), [filters, priceBounds]);

  const visibleProducts = products.filter((p) => p.available).length;
  const hiddenProducts = products.length - visibleProducts;
  const featuredProducts = products.filter((p) => p.featured).length;
  const lowStockProducts = products.filter((p) => getProductStockState(p) === "LOW_STOCK").length;
  const outOfStockProducts = products.filter((p) => getProductStockState(p) === "OUT_OF_STOCK").length;

  const displayProducts = useMemo(() => {
    switch (productTab) {
      case "LIVE": return products.filter(p => p.available);
      case "FEATURED": return products.filter(p => p.featured);
      case "LOW_STOCK": return products.filter(p => getProductStockState(p) === "LOW_STOCK");
      case "OUT_OF_STOCK": return products.filter(p => getProductStockState(p) === "OUT_OF_STOCK");
      default: return products;
    }
  }, [products, productTab]);

  const allCurrentSelected = displayProducts.length > 0 && displayProducts.every((p) => selectedIds.includes(p.id));

  const updateFilters = (updater: (current: ProductListState) => ProductListState) => {
    setFilters(updater);
  };

  const clearFilters = () => updateFilters(() => defaultListState);

  const toggleColumn = (column: ProductColumnKey) => {
    setColumns((current) => ({ ...current, [column]: !current[column] }));
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSelectAllCurrent = () => {
    if (allCurrentSelected) {
      const currentIds = new Set(displayProducts.map((p) => p.id));
      setSelectedIds((current) => current.filter((id) => !currentIds.has(id)));
    } else {
      const next = new Set([...selectedIds, ...displayProducts.map((p) => p.id)]);
      setSelectedIds(Array.from(next));
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    try {
      await adminApi.updateProduct(product.id, { available: !product.available });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(product.available ? "Product hidden" : "Product live");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update visibility"));
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await adminApi.updateProduct(product.id, { featured: !product.featured });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(product.featured ? "Featured removed" : "Product featured");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update featured flag"));
    }
  };

  const handleToggleTodayDeal = async (product: Product) => {
    try {
      await adminApi.updateProduct(product.id, { todayDeal: !product.todayDeal });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(product.todayDeal ? "Removed from deals" : "Added to today deals");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update deal status"));
    }
  };

  const refreshProductQueries = async (id?: number | null) => {
    const promises = [queryClient.invalidateQueries({ queryKey: ["admin-products"] })];
    if (id) {
      promises.push(queryClient.invalidateQueries({ queryKey: ["admin-product", id] }));
    }
    await Promise.all(promises);
    toast.success("Refreshed");
  };

  const handleExportProducts = async () => {
    try {
      const response = await adminApi.exportProducts();
      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `products-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Export failed"));
    }
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    const toastId = toast.loading("Importing products...");
    try {
      await adminApi.importProducts(file);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Products imported successfully", { id: toastId });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Import failed"), { id: toastId });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const openCreateComposer = () => {
    setSelectedProductId(null);
    setForm(emptyForm);
    setDraftImages([]);
    setComposerOpen(true);
  };

  const openEditComposer = (id: number) => {
    setSelectedProductId(id);
    setComposerOpen(true);
  };

  useEffect(() => {
    if (selectedProduct && composerOpen) {
      setForm(toForm(selectedProduct));
      setDraftImages([]);
    }
  }, [selectedProduct, composerOpen]);

  const resetComposer = () => {
    setComposerOpen(false);
    setSelectedProductId(null);
    setForm(emptyForm);
    setDraftImages([]);
    setUploadingImages(false);
    setUploadingVideo(false);
  };

  const handleCategoryChange = (id: string) => {
    const category = categories.find((c) => String(c.id) === id);
    setForm((current) => applyCategoryFormShape({ ...current, categoryId: id }, category?.name));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    if (draftImages.length + files.length > MAX_PRODUCT_IMAGES) {
      toast.error(`Maximum ${MAX_PRODUCT_IMAGES} images allowed`);
      return;
    }

    setUploadingImages(true);
    try {
      const uploaded = await Promise.all(files.map((file) => adminApi.uploadMedia(file, "products")));
      const nextImages = uploaded.map((res) => ({ imageUrl: res.url, publicId: res.publicId }));

      if (selectedProductId) {
        await adminApi.updateProduct(selectedProductId, { images: nextImages });
        await queryClient.invalidateQueries({ queryKey: ["admin-product", selectedProductId] });
        await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      } else {
        setDraftImages((current) => [...current, ...nextImages]);
      }
      toast.success("Images uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Image upload failed"));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDraftImageRemove = async (publicId: string) => {
    try {
      await adminApi.deleteMedia(publicId);
      setDraftImages((current) => current.filter((img) => img.publicId !== publicId));
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  const handleExistingImageRemove = async (imageId: number) => {
    if (!selectedProductId) return;
    try {
      await adminApi.deleteProductImage(selectedProductId, imageId);
      await queryClient.invalidateQueries({ queryKey: ["admin-product", selectedProductId] });
      toast.success("Image removed");
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  const handleProductVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const response = await adminApi.uploadMedia(file, "videos");
      setForm((current) => ({ ...current, videoUrl: response.url }));
      toast.success("Video uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Video upload failed"));
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateProductForm(form, selectedProductId ? (selectedProduct?.images.length ?? 0) : draftImages.length);
    if (error) {
      toast.error(error);
      return;
    }

    const toastId = toast.loading(selectedProductId ? "Updating product..." : "Creating product...");
    try {
      const payload = toPayload(form, selectedProductId ? undefined : draftImages);
      if (selectedProductId) {
        await adminApi.updateProduct(selectedProductId, payload);
        toast.success("Product updated", { id: toastId });
      } else {
        await adminApi.createProduct(payload);
        toast.success("Product created", { id: toastId });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      resetComposer();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Save failed"), { id: toastId });
    }
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;
    setDeleteRequest({ kind: "single", productId: selectedProduct.id, title: selectedProduct.title });
  };

  const confirmDeleteRequest = async () => {
    if (!deleteRequest) return;
    const toastId = toast.loading("Deleting...");
    try {
      if (deleteRequest.kind === "bulk") {
        await adminApi.bulkProductAction({ action: "DELETE", productIds: selectedIds });
        setSelectedIds([]);
      } else {
        await adminApi.deleteProduct(deleteRequest.productId);
        if (selectedProductId === deleteRequest.productId) resetComposer();
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Deleted successfully", { id: toastId });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Delete failed"), { id: toastId });
    } finally {
      setDeleteRequest(null);
    }
  };

  const executeBulkAction = async (payload: ProductBulkActionPayload, successMessage: string) => {
    const toastId = toast.loading("Processing bulk action...");
    try {
      await adminApi.bulkProductAction(payload);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(successMessage, { id: toastId });
      setSelectedIds([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Bulk action failed"), { id: toastId });
    }
  };

  const openQuickEdit = (product: Product) => {
    setQuickEdit({
      product,
      price: String(product.price ?? ""),
      originalPrice: String(product.originalPrice ?? ""),
      discountPercent: String(product.discountPercent ?? ""),
      stockQuantity: String(product.stockQuantity ?? ""),
      available: product.available,
      featured: product.featured,
      bestSeller: product.bestSeller,
      todayDeal: product.todayDeal
    });
  };

  const handleQuickEditSave = async () => {
    if (!quickEdit) return;
    setQuickEditSaving(true);
    try {
      await adminApi.updateProduct(quickEdit.product.id, {
        price: parseDecimalInput(quickEdit.price),
        originalPrice: parseDecimalInput(quickEdit.originalPrice),
        discountPercent: parseIntegerInput(quickEdit.discountPercent),
        stockQuantity: parseIntegerInput(quickEdit.stockQuantity),
        available: quickEdit.available,
        featured: quickEdit.featured,
        bestSeller: quickEdit.bestSeller,
        todayDeal: quickEdit.todayDeal
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Quick changes saved");
      setQuickEdit(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save quick changes"));
    } finally {
      setQuickEditSaving(false);
    }
  };

  const selectedCategory = useMemo(() => categories.find((c) => String(c.id) === form.categoryId), [categories, form.categoryId]);
  const categoryTemplate = useMemo(() => resolveProductCategoryTemplate(selectedCategory?.name), [selectedCategory]);

  const renderCommonField = (fieldKey: CommonProductFieldKey) => {
    const meta = commonFieldMeta[fieldKey];
    if (!meta) return null;

    if (meta.type === "select") {
      return (
        <label key={fieldKey} className="space-y-2">
          <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
          <select className="admin-select" value={form[fieldKey]} onChange={(event) => setForm((current) => ({ ...current, [fieldKey]: event.target.value }))}>
            <option value="">Choose {meta.label.toLowerCase()}</option>
            {meta.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label key={fieldKey} className="space-y-2">
        <span className="text-xs font-semibold text-slate-500">{meta.label}</span>
        <input className="admin-input" placeholder={meta.placeholder} value={form[fieldKey]} onChange={(event) => setForm((current) => ({ ...current, [fieldKey]: event.target.value }))} />
      </label>
    );
  };

  const renderCustomField = (field: CategoryCustomField) => {
    if (field.type === "select") {
      return (
        <label key={field.key} className="space-y-2">
          <span className="text-xs font-semibold text-slate-500">{field.label}</span>
          <select 
            className="admin-select" 
            value={form.customAttributes[field.key] ?? ""} 
            onChange={(event) => setForm((current) => ({ ...current, customAttributes: { ...current.customAttributes, [field.key]: event.target.value } }))}
          >
            <option value="">Choose {field.label.toLowerCase()}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label key={field.key} className="space-y-2">
        <span className="text-xs font-semibold text-slate-500">{field.label}</span>
        <input className="admin-input" placeholder={field.placeholder} value={form.customAttributes[field.key] ?? ""} onChange={(event) => setForm((current) => ({ ...current, customAttributes: { ...current.customAttributes, [field.key]: event.target.value } }))} />
      </label>
    );
  };

  const effectiveMinPrice = filters.minPrice ?? priceBounds.min;
  const effectiveMaxPrice = filters.maxPrice ?? priceBounds.max;

  const FilterSelect = ({ label, value, onChange, children }: { label: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode }) => (
    <div className="flex flex-col">
      <div className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="relative">
        <select className="admin-select !h-11 !pl-4 !pr-10 text-xs font-bold shadow-sm" value={value} onChange={onChange}>
          {children}
        </select>
      </div>
    </div>
  );

  const imageCount = selectedProduct ? selectedProduct.images.length : draftImages.length;

  return (
    <div className="admin-page-container">
      <PageHeader
        eyebrow="Intelligence Center"
        title={
          <>Inventory <span className="text-white/60">Workbench</span></>
        }
        description="Manage your global catalog with precision. Use the multi-layered workbench to filter, audit, and curate products across all stores."
        variant="premium"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:bg-white/20 border border-white/10" 
              onClick={() => refreshProductQueries(selectedProductId)}
            >
              <RefreshCcw className="h-4 w-4 transition-transform group-hover:rotate-180" />
              Sync Cloud
            </button>
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:bg-white/20 border border-white/10" 
              onClick={handleExportProducts}
            >
              <Download className="h-4 w-4 transition-transform group-hover:-translate-y-1" />
              Export
            </button>
            <input 
              ref={importInputRef} 
              type="file" 
              accept=".csv,text/csv" 
              className="hidden" 
              onChange={(event) => handleImportFile(event.target.files?.[0])} 
            />
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
              onClick={openCreateComposer}
            >
              <PackagePlus className="h-4 w-4" />
              Deploy SKU
            </button>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ecosystem Total"
            value={String(products.length)}
            meta={`${formatNumber(products.length)} global units`}
            icon={<Boxes className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Market Visibility"
            value={String(visibleProducts)}
            meta={`${hiddenProducts} restricted nodes`}
            icon={<Eye className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Logistics Alert"
            value={String(lowStockProducts)}
            meta="Threshold violations"
            icon={<PackageSearch className="h-6 w-6" />}
            variant="glass"
            trend="down"
          />
          <StatCard
            label="Depleted"
            value={String(outOfStockProducts)}
            meta="Restock priority: HIGH"
            icon={<Archive className="h-6 w-6" />}
            variant="glass"
            trend="down"
          />
        </div>
      </PageHeader>

      <div>
        <section className="space-y-4">
          <div className="space-y-4">
            <section className="admin-card-elevated border-none bg-white p-8 shadow-2xl dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                    SKU Discovery Protocol
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Unified Search & Filtering</h2>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Refine the global catalog by category, brand, store affinity, and logistics status.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-slate-900" 
                  onClick={clearFilters}
                >
                  Reset Parameters
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                <div className="relative md:col-span-2 xl:col-span-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    className="admin-input !h-11 pl-11 shadow-sm"
                    placeholder="Search products, SKU, model..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>

                <FilterSelect
                  label="Category"
                  value={String(filters.categoryIds[0] ?? "")}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      categoryIds: event.target.value ? [Number(event.target.value)] : []
                    }))
                  }
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="Brand"
                  value={String(filters.brandIds[0] ?? "")}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      brandIds: event.target.value ? [Number(event.target.value)] : []
                    }))
                  }
                >
                  <option value="">All brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="Store"
                  value={String(filters.storeIds[0] ?? "")}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      storeIds: event.target.value ? [Number(event.target.value)] : []
                    }))
                  }
                >
                  <option value="">All stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  label="Status"
                  value={filters.availability}
                  onChange={(event) => updateFilters((current) => ({ ...current, availability: event.target.value as ProductAvailabilityFilter }))}
                >
                  <option value="ALL">All statuses</option>
                  <option value="VISIBLE">Live</option>
                  <option value="HIDDEN">Hidden</option>
                </FilterSelect>

                <FilterSelect
                  label="Stock"
                  value={String(filters.stockStates[0] ?? "")}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      stockStates: event.target.value ? [event.target.value as ProductStockState] : []
                    }))
                  }
                >
                  <option value="">All stock</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </FilterSelect>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_220px]">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="admin-input"
                    type="number"
                    min={priceBounds.min}
                    max={effectiveMaxPrice}
                    value={effectiveMinPrice}
                    onChange={(event) =>
                      updateFilters((current) => ({
                        ...current,
                        minPrice: Math.min(Number(event.target.value || priceBounds.min), current.maxPrice ?? priceBounds.max)
                      }))
                    }
                  />
                  <input
                    className="admin-input"
                    type="number"
                    min={effectiveMinPrice}
                    max={priceBounds.max}
                    value={effectiveMaxPrice}
                    onChange={(event) =>
                      updateFilters((current) => ({
                        ...current,
                        maxPrice: Math.max(Number(event.target.value || priceBounds.max), current.minPrice ?? priceBounds.min)
                      }))
                    }
                  />
                </div>
                <FilterSelect
                  label="Merchandising"
                  value={filters.featured ? "FEATURED" : filters.bestSeller ? "BEST_SELLER" : filters.todayDeal ? "TODAY_DEAL" : "ALL"}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      featured: event.target.value === "FEATURED",
                      bestSeller: event.target.value === "BEST_SELLER",
                      todayDeal: event.target.value === "TODAY_DEAL"
                    }))
                  }
                >
                  <option value="ALL">All products</option>
                  <option value="FEATURED">Featured only</option>
                  <option value="BEST_SELLER">Best sellers</option>
                  <option value="TODAY_DEAL">Today deals</option>
                </FilterSelect>
                <button type="button" className="admin-button h-full justify-center" onClick={() => refreshProductQueries(selectedProductId)}>
                  <Filter className="mr-2 h-4 w-4" />
                  Apply
                </button>
              </div>
            </section>

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

          <div className="overflow-hidden rounded-[2rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
            <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
              <div className="flex flex-wrap items-center gap-2 px-6 pt-6">
                {([
                  ["ALL", "All Products", products.length],
                  ["LIVE", "Live", visibleProducts],
                  ["FEATURED", "Featured", featuredProducts],
                  ["LOW_STOCK", "Low Stock", lowStockProducts],
                  ["OUT_OF_STOCK", "Out of Stock", outOfStockProducts]
                ] as Array<[ProductTab, string, number]>).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    type="button"
                    className={cn(
                      "group relative px-6 py-4 text-xs font-black uppercase tracking-widest transition-all",
                      productTab === tab 
                        ? "workbench-tab-active" 
                        : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                    )}
                    onClick={() => setProductTab(tab)}
                  >
                    <span className="flex items-center gap-2">
                      {label}
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                        productTab === tab ? "bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]" : "bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)]"
                      )}>
                        {count}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">View</span>
                  <button
                    type="button"
                    className={`admin-icon-button !h-10 !w-10 ${viewMode === "table" ? "!border-blue-200 !bg-blue-50 !text-[#1E63F2]" : ""}`}
                    aria-label="Table view"
                    onClick={() => setViewMode("table")}
                  >
                    <Columns3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`admin-icon-button !h-10 !w-10 ${viewMode === "grid" ? "!border-blue-200 !bg-blue-50 !text-[#1E63F2]" : ""}`}
                    aria-label="Grid view"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <details className="relative">
                    <summary className="admin-button-secondary !px-4 !py-2.5 list-none cursor-pointer">
                      <Columns3 className="mr-2 h-4 w-4" />
                      Columns
                    </summary>
                    <div className="absolute left-0 top-[calc(100%+0.6rem)] z-30 w-64 rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)]">
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
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">{displayProducts.length} shown</span>
                  {activeFilterCount ? (
                    <button type="button" className="admin-button-secondary !px-4 !py-2.5" onClick={clearFilters}>
                      Clear filters
                    </button>
                  ) : null}
                  {productsQuery.isFetching ? <span className="admin-badge-sky">Syncing...</span> : null}
                </div>
              </div>
            </div>
            {viewMode === "table" ? (
            <div className="admin-scrollbar overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left text-sm border-collapse">
                <thead className="bg-[color:var(--color-bg)]/50 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                  <tr>
                    <th className="px-6 py-5">
                      <input className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]" type="checkbox" checked={allCurrentSelected} onChange={toggleSelectAllCurrent} />
                    </th>
                    {columns.product ? <th className="px-6 py-5">Product Details</th> : null}
                    {columns.category ? <th className="px-6 py-5">Category</th> : null}
                    {columns.stores ? <th className="px-6 py-5">Availability</th> : null}
                    {columns.price ? <th className="px-6 py-5">Price Matrix</th> : null}
                    {columns.stock ? <th className="px-6 py-5">Inventory</th> : null}
                    {columns.status ? <th className="px-6 py-5">Status</th> : null}
                    {columns.featured ? <th className="px-6 py-5 text-center">Featured</th> : null}
                    {columns.updated ? <th className="px-6 py-5">Last Activity</th> : null}
                    {columns.actions ? <th className="px-6 py-5 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {displayProducts.map((product) => {
                    const stock = Number(product.stockQuantity ?? 0);
                    const dealLive = isTodayDealLive(product);
                    const stockState = getProductStockState(product);
                    const stockClass = stockState === "OUT_OF_STOCK" ? "admin-badge-rose" : stockState === "LOW_STOCK" ? "admin-badge-amber" : "admin-badge-emerald";
                    
                    return (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={product.id} 
                        className={cn(
                          "group transition-all hover:bg-[color:var(--color-primary)]/5",
                          selectedProductId === product.id ? "bg-[color:var(--color-primary)]/10" : ""
                        )}
                      >
                        <td className="px-6 py-5">
                          <input
                            className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]"
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                          />
                        </td>
                        {columns.product ? (
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] shadow-sm group-hover:shadow-md transition-shadow">
                                {product.images[0]?.imageUrl ? (
                                  <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[color:var(--color-primary)]/5">
                                    <PackageSearch className="h-5 w-5 text-[color:var(--color-primary)]/30" />
                                  </div>
                                )}
                                {!product.available && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <EyeOff className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 max-w-[320px]">
                                <div className="truncate text-[15px] font-bold tracking-tight text-[color:var(--color-text)]">{product.title}</div>
                                <div className="mt-1 flex items-center gap-2 truncate text-[11px] font-medium text-[color:var(--color-text-muted)]">
                                  <span className="uppercase tracking-wider">{product.brandName}</span>
                                  <span className="h-1 w-1 rounded-full bg-[color:var(--color-border)]" />
                                  <span className="truncate">{product.sku || 'No SKU'}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        ) : null}
                        {columns.category ? (
                          <td className="px-6 py-5">
                            <span className="text-[13px] font-medium text-[color:var(--color-text-secondary)]">
                              {product.categoryName ?? "Unassigned"}
                            </span>
                          </td>
                        ) : null}
                        {columns.stores ? (
                          <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1">
                            {product.stores.slice(0, 2).map((s) => (
                              <span key={s.id} className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {s.name}
                              </span>
                            ))}
                            {product.stores.length > 2 ? (
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                +{product.stores.length - 2} more
                              </span>
                            ) : null}
                          </div>
                        </td>
                        ) : null}
                        {columns.price ? (
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-[color:var(--color-text)]">₹{product.price.toLocaleString("en-IN")}</span>
                              {product.originalPrice && product.originalPrice > product.price ? (
                                <span className="text-[10px] text-[color:var(--color-text-muted)] line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                        {columns.stock ? (
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <span className={`admin-badge ${stockClass}`}>{stock} units</span>
                              <div className="text-xs text-slate-400">Threshold {getEffectiveLowStockThreshold(product)}</div>
                            </div>
                          </td>
                        ) : null}
                        {columns.status ? (
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={product.available ? "admin-badge-green" : "admin-badge-slate"}>
                                {product.available ? (
                                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />Visible</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" />Hidden</span>
                                )}
                              </span>
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
                        {columns.featured ? (
                          <td className="px-4 py-4 text-center">
                            <Tooltip title={product.featured ? "Remove featured" : "Mark featured"}>
                              <button
                                type="button"
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                                  product.featured
                                    ? "border-blue-200 bg-blue-50 text-[#1E63F2] shadow-sm"
                                    : "border-slate-200 bg-white text-slate-300 hover:border-blue-200 hover:text-[#1E63F2]"
                                }`}
                                onClick={() => handleToggleFeatured(product)}
                                aria-label={product.featured ? "Remove featured" : "Mark featured"}
                              >
                                <Star className={`h-4 w-4 ${product.featured ? "fill-current" : ""}`} />
                              </button>
                            </Tooltip>
                          </td>
                        ) : null}
                        {columns.updated ? <td className="px-4 py-4 text-sm text-slate-500">{formatUpdatedAtLabel(product.updatedAt)}</td> : null}
                        {columns.actions ? (
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Tooltip title="Preview product">
                                <IconButton
                                  component="a"
                                  href={`${STOREFRONT_PREVIEW_BASE_URL}/products/${product.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="!h-10 !w-10 !border !border-slate-200 !text-slate-600 hover:!bg-slate-50"
                                >
                                  <Eye className="h-4 w-4" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={product.todayDeal ? "Remove today deal" : "Mark today deal"}>
                                <IconButton className="!h-10 !w-10 !border !border-rose-200 !text-rose-600 hover:!bg-rose-50" onClick={() => handleToggleTodayDeal(product)}>
                                  <Zap className="h-4 w-4" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Quick edit price, stock, and flags">
                                <IconButton className="!h-10 !w-10 !border !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50" onClick={() => openQuickEdit(product)}>
                                  <Save className="h-4 w-4" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={product.available ? "Hide product" : "Show product"}>
                                <IconButton className="!h-10 !w-10 !border !border-slate-200 !text-slate-600 hover:!bg-slate-50" onClick={() => handleToggleVisibility(product)}>
                                  {product.available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View history">
                                <button type="button" className="admin-icon-button !h-9 !w-9" onClick={() => setAuditTarget({ id: product.id, title: product.title })}>
                                  <History className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip title="Edit details">
                                <button type="button" className="admin-icon-button !h-9 !w-9 text-[color:var(--color-primary)]" onClick={() => openEditComposer(product.id)}>
                                  <PencilLine className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        ) : null}
                      </motion.tr>
                    );
                  })}
                  {!displayProducts.length ? (
                    <tr>
                      <td colSpan={1 + (Object.values(columns).filter(Boolean).length)} className="px-6 py-16 text-center text-sm text-slate-400">
                        No products match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="grid gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {displayProducts.map((product) => {
                  const stock = Number(product.stockQuantity ?? 0);
                  const stockState = getProductStockState(product);
                  
                  return (
                    <motion.article 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={product.id} 
                      className={cn(
                        "group relative flex flex-col rounded-3xl border bg-[color:var(--color-surface)] p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[color:var(--color-primary)]/5",
                        selectedIds.includes(product.id) ? "border-[color:var(--color-primary)] ring-4 ring-[color:var(--color-primary)]/10" : "border-[color:var(--color-border)]"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] shadow-sm">
                          {product.images[0]?.imageUrl ? (
                            <img src={product.images[0].imageUrl} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[color:var(--color-primary)]/5">
                              <PackageSearch className="h-8 w-8 text-[color:var(--color-primary)]/30" />
                            </div>
                          )}
                          <div className="absolute left-2 top-2">
                             <input
                              className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]"
                              type="checkbox"
                              checked={selectedIds.includes(product.id)}
                              onChange={() => toggleSelection(product.id)}
                            />
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="line-clamp-2 text-[15px] font-black leading-tight text-[color:var(--color-text)]">
                            {product.title}
                          </div>
                          <div className="truncate text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                            {product.brandName}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ring-1 ring-inset",
                              product.available ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" : "bg-slate-500/10 text-slate-500 ring-slate-500/20"
                            )}>
                              {product.available ? "Live" : "Hidden"}
                            </span>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ring-1 ring-inset",
                              stockState === "OUT_OF_STOCK" ? "bg-rose-500/10 text-rose-500 ring-rose-500/20" :
                              stockState === "LOW_STOCK" ? "bg-amber-500/10 text-amber-500 ring-amber-500/20" :
                              "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                            )}>
                              {stock} units
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[color:var(--color-bg)]/50 p-3 ring-1 ring-[color:var(--color-border)]">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Price</div>
                          <div className="mt-1 text-lg font-black text-[color:var(--color-text)]">{formatCurrency(product.price)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">Category</div>
                          <div className="mt-1 truncate text-xs font-bold text-[color:var(--color-text-secondary)]">
                            {product.categoryName || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                        <span className="text-[10px] font-bold text-[color:var(--color-text-muted)]">
                          Updated {formatUpdatedAtLabel(product.updatedAt)}
                        </span>
                        <div className="flex gap-1.5">
                           <Tooltip title="Quick actions">
                            <button 
                              type="button" 
                              className="admin-icon-button !h-8 !w-8" 
                              onClick={() => openQuickEdit(product)}
                            >
                              <Zap className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip title="Edit Product">
                            <button 
                              type="button" 
                              className="admin-icon-button !h-8 !w-8 !text-[color:var(--color-primary)]" 
                              onClick={() => openEditComposer(product.id)}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <Dialog
          fullWidth
          maxWidth="md"
          open={quickEdit != null}
          onClose={() => setQuickEdit(null)}
          slotProps={{
            backdrop: { className: "!bg-slate-950/65 backdrop-blur-md" },
            paper: { className: "admin-dialog-surface admin-fade-in !m-4 !max-w-4xl overflow-hidden" }
          }}
        >
          {quickEdit ? (() => {
            const price = Number(quickEdit.price || 0);
            const originalPrice = Number(quickEdit.originalPrice || 0);
            const discount = Number(quickEdit.discountPercent || 0);
            const stock = Number(quickEdit.stockQuantity || 0);
            const estimatedValue = Number.isFinite(price) && Number.isFinite(stock) ? price * stock : 0;
            const computedDiscount = originalPrice > price && price > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : discount;
            const stockTone = stock <= 0 ? "text-rose-600 bg-rose-50" : stock <= Number(quickEdit.product.lowStockThreshold ?? 5) ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50";

            return (
              <>
                <DialogContent className="!p-0">
                  <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_58%,#0f766e_100%)] px-6 py-6 text-white">
                    <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white" onClick={() => setQuickEdit(null)} aria-label="Close quick edit">
                      <X className="h-4 w-4" />
                    </button>
                    <div className="admin-pill border-white/20 bg-white/10 text-white">Advanced quick popup</div>
                    <div className="mt-4 grid gap-5 md:grid-cols-[1fr_210px] md:items-end">
                      <div>
                        <h2 className="max-w-2xl text-2xl font-black leading-tight">{quickEdit.product.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/72">{getProductTableSubtitle(quickEdit.product)}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Inventory value</div>
                        <div className="mt-2 text-2xl font-black">{formatCurrency(estimatedValue || 0)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-6 lg:grid-cols-[1fr_0.86fr]">
                    <section className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><IndianRupee className="h-3.5 w-3.5" /> Price</div>
                          <div className="mt-2 text-xl font-black text-slate-950">{formatCurrency(price || 0)}</div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"><Percent className="h-3.5 w-3.5" /> Discount</div>
                          <div className="mt-2 text-xl font-black text-slate-950">{computedDiscount || 0}%</div>
                        </div>
                        <div className={`rounded-[22px] border border-slate-200 p-4 ${stockTone}`}>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Gauge className="h-3.5 w-3.5" /> Stock</div>
                          <div className="mt-2 text-xl font-black">{stock || 0} units</div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Pricing and stock controls</div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Selling price</span>
                            <input className="admin-input bg-white" type="number" min="1" value={quickEdit.price} onChange={(event) => setQuickEdit((current) => current ? { ...current, price: event.target.value } : current)} />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Original price</span>
                            <input className="admin-input bg-white" type="number" min="0" value={quickEdit.originalPrice} onChange={(event) => setQuickEdit((current) => current ? { ...current, originalPrice: event.target.value } : current)} />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Discount percent</span>
                            <input className="admin-input bg-white" type="number" min="0" max="95" value={quickEdit.discountPercent} onChange={(event) => setQuickEdit((current) => current ? { ...current, discountPercent: event.target.value } : current)} />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Stock quantity</span>
                            <input className="admin-input bg-white" type="number" min="0" value={quickEdit.stockQuantity} onChange={(event) => setQuickEdit((current) => current ? { ...current, stockQuantity: event.target.value } : current)} />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Storefront flags</div>
                        <div className="mt-4 grid gap-3">
                          {[
                            ["available", "Visible on website", "Customers can see and buy this product."],
                            ["featured", "Featured product", "Eligible for featured shelves and badges."],
                            ["bestSeller", "Best seller", "Eligible for best seller shelves."],
                            ["todayDeal", "Today deal", "Show as a deal product."]
                          ].map(([key, label, helper]) => {
                            const checked = Boolean(quickEdit[key as keyof Pick<QuickEditState, "available" | "featured" | "bestSeller" | "todayDeal">]);
                            return (
                              <label key={key} className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                                <span>
                                  <span className="block text-sm font-black text-slate-900">{label}</span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>
                                </span>
                                <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#1E63F2]" : "bg-slate-300"}`}>
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={checked}
                                    onChange={(event) =>
                                      setQuickEdit((current) =>
                                        current
                                          ? {
                                              ...current,
                                              [key]: event.target.checked
                                            }
                                          : current
                                      )
                                    }
                                  />
                                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  </div>
                </DialogContent>
                <DialogActions className="admin-dialog-footer flex flex-wrap justify-between gap-3">
                  <button
                    type="button"
                    className="admin-button-secondary rounded-2xl px-4 py-2.5 text-sm font-semibold"
                    onClick={() => {
                      const productId = quickEdit.product.id;
                      setQuickEdit(null);
                      openEditComposer(productId);
                    }}
                    disabled={quickEditSaving}
                  >
                    Open full editor
                  </button>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="admin-button-secondary rounded-2xl px-4 py-2.5 text-sm font-semibold" onClick={() => setQuickEdit(null)} disabled={quickEditSaving}>
                      Cancel
                    </button>
                    <button type="button" className="admin-button-primary rounded-2xl px-5 py-2.5 text-sm font-semibold" onClick={() => void handleQuickEditSave()} disabled={quickEditSaving || quickEdit == null}>
                      {quickEditSaving ? "Saving..." : "Save quick changes"}
                    </button>
                  </div>
                </DialogActions>
              </>
            );
          })() : null}
        </Dialog>

        <SlideOverDrawer
          open={composerOpen}
          onClose={resetComposer}
          title={selectedProduct ? "Edit product" : "Create product"}
          subtitle={selectedProduct ? "Update listing details, media, stock, and merchandising flags." : "Post a new catalog item with brand, category, store assignment, and images."}
          width="xl"
        >
        <form className="space-y-6" onSubmit={handleSave}>
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
                Cancel
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
              <select className="admin-select" value={form.productStatus} onChange={(event) => setForm((current) => ({ ...current, productStatus: event.target.value as ProductFormState["productStatus"] }))}>
                <option value="ACTIVE">Active listing</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <input className="admin-input" placeholder="Selling price" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
              <input className="admin-input" placeholder="Original price" value={form.originalPrice} onChange={(event) => setForm((current) => ({ ...current, originalPrice: event.target.value }))} />
              <input className="admin-input" placeholder="Discount percent" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} />
              <input className="admin-input" placeholder="Stock quantity" value={form.stockQuantity} onChange={(event) => setForm((current) => ({ ...current, stockQuantity: event.target.value }))} />
              <input className="admin-input" placeholder="Low stock threshold" value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} />
              <input className="admin-input" placeholder="Display order" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} />
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

          <section className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">SEO metadata</div>
              <p className="mt-2 text-sm text-slate-500">Optional search metadata used by the website product detail page and social previews.</p>
            </div>

            <input className="admin-input" placeholder="SEO title" value={form.seoTitle} onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))} />
            <textarea className="admin-textarea" rows={3} placeholder="SEO description" value={form.seoDescription} onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))} />
            <input className="admin-input" placeholder="SEO keywords, comma separated" value={form.seoKeywords} onChange={(event) => setForm((current) => ({ ...current, seoKeywords: event.target.value }))} />
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

          <div className="sticky bottom-0 z-10 -mx-5 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
            <button type="button" className="admin-button-secondary" onClick={resetComposer}>
              Cancel
            </button>
            <button className="admin-button" disabled={uploadingImages}>
              {selectedProduct ? "Update product" : "Create product"}
            </button>
          </div>
        </form>
        </SlideOverDrawer>
      </div>

      <ProductAuditDrawer
        productId={auditTarget?.id ?? null}
        productTitle={auditTarget?.title}
        open={auditTarget != null}
        onClose={() => setAuditTarget(null)}
      />

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

function ProductStatCard({
  helper,
  icon: Icon,
  label,
  tone,
  trend,
  value
}: {
  helper: string;
  icon: LucideIcon;
  label: string;
  tone: string;
  trend: string;
  value: number | string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 transition-all hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[color:var(--color-primary)]/10">
      <div className={cn("absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-3xl transition-all group-hover:opacity-20", tone)} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[color:var(--color-text-muted)]">{label}</div>
          <div className="flex flex-col gap-1">
            <h3 className="text-4xl font-black tracking-tight text-[color:var(--color-text)]">
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </h3>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-[color:var(--color-text-muted)]">{helper}</span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm",
                tone.includes("emerald") ? "bg-emerald-500 text-white" : 
                tone.includes("blue") ? "bg-blue-500 text-white" : 
                tone.includes("rose") ? "bg-rose-500 text-white" : 
                "bg-amber-500 text-white"
              )}>
                {trend}
              </span>
            </div>
          </div>
        </div>
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6", tone)}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </article>
  );
}
