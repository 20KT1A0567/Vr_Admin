import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Button, Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowUpDown, Boxes, Eye, LayoutGrid, PencilLine, Plus, RotateCcw, Search, Trash2,
  Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Globe, Sparkles, MapPin, Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import type { Product, ProductSection, ProductSectionSelectionMode, ProductSectionType } from "types";
import { cn } from "utils/cn";
import { applyWorkflowStatus, publishWorkflowOptions, resolvePublishWorkflowStatus, type PublishWorkflowStatus, workflowAppearance } from "utils/publishWorkflow";

import { BannersPage } from "./BannersPage";
import { StoresPage } from "./StoresPage";
import { CategoriesPage } from "./CategoriesPage";
import { BrandsPage } from "./BrandsPage";

interface ContentPageProps {
  focus?: "all" | "brands" | "categories" | "banners";
}

type SectionForm = {
  title: string;
  subtitle: string;
  sectionType: ProductSectionType;
  selectionMode: ProductSectionSelectionMode;
  displayOrder: string;
  maxProducts: string;
  workflowStatus: PublishWorkflowStatus;
  active: boolean;
  startAt: string;
  endAt: string;
  productIds: number[];
};

const sectionTypeOptions: Array<{ label: string; value: ProductSectionType }> = [
  { label: "Best sellers", value: "BEST_SELLERS" },
  { label: "Today's deals", value: "TODAYS_DEALS" },
  { label: "Featured products", value: "FEATURED_PRODUCTS" },
  { label: "New arrivals", value: "NEW_ARRIVALS" },
  { label: "Trending products", value: "TRENDING_PRODUCTS" },
  { label: "Recommended", value: "RECOMMENDED_PRODUCTS" },
  { label: "Top rated", value: "TOP_RATED" },
  { label: "Low price deals", value: "LOW_PRICE_DEALS" }
];

const defaultHomeSectionOptions: Array<{ label: string; value: ProductSectionType; description: string }> = [
  { label: "Today's Deals", value: "TODAYS_DEALS", description: "Active deal products and countdown shelf." },
  { label: "Featured Products", value: "FEATURED_PRODUCTS", description: "Handpicked or featured product shelf." },
  { label: "Best Sellers", value: "BEST_SELLERS", description: "Popular products from admin or sales data." },
  { label: "New Arrivals", value: "NEW_ARRIVALS", description: "Recently added products." },
  { label: "Low Price Deals", value: "LOW_PRICE_DEALS", description: "Lower price discounted products." }
];

const allDefaultHomeSectionTypes = defaultHomeSectionOptions.map((option) => option.value).join(",");

const emptyForm: SectionForm = {
  title: "",
  subtitle: "",
  sectionType: "FEATURED_PRODUCTS",
  selectionMode: "AUTOMATIC",
  displayOrder: "0",
  maxProducts: "8",
  workflowStatus: "DRAFT",
  active: false,
  startAt: "",
  endAt: "",
  productIds: []
};

function labelForType(type: ProductSectionType) {
  return sectionTypeOptions.find((option) => option.value === type)?.label ?? type.replace(/_/g, " ");
}

function parseDefaultHomeSectionTypes(value?: string) {
  if (value == null) {
    return defaultHomeSectionOptions.map((option) => option.value);
  }
  const validTypes = new Set(defaultHomeSectionOptions.map((option) => option.value));
  return value.split(",").map((item) => item.trim()).filter((item): item is ProductSectionType => validTypes.has(item as ProductSectionType));
}

function serializeDefaultHomeSectionTypes(values: ProductSectionType[]) {
  return values.filter((value, index) => values.indexOf(value) === index).join(",");
}

function toDateTimeInputValue(value?: string) {
  return value ? value.slice(0, 16) : "";
}

function normalizeDateTimeValue(value: string) {
  return value.trim() ? (value.length === 16 ? `${value}:00` : value) : undefined;
}

function sectionToForm(section: ProductSection): SectionForm {
  return {
    title: section.title,
    subtitle: section.subtitle ?? "",
    sectionType: section.sectionType,
    selectionMode: section.selectionMode,
    displayOrder: String(section.displayOrder ?? 0),
    maxProducts: String(section.maxProducts ?? 8),
    workflowStatus: resolvePublishWorkflowStatus({
      active: section.active,
      startAt: section.startAt,
      endAt: section.endAt,
      inactiveLabel: "UNPUBLISHED"
    }),
    active: section.active,
    startAt: toDateTimeInputValue(section.startAt),
    endAt: toDateTimeInputValue(section.endAt),
    productIds: section.products?.map((item) => item.product.id) ?? []
  };
}

export function ContentPage(_props: ContentPageProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const sectionsQuery = useQuery({ queryKey: ["admin-product-sections"], queryFn: adminApi.getProductSections });
  const productsQuery = useQuery({ queryKey: ["admin-products-content"], queryFn: () => adminApi.getProducts() });
  const settingsQuery = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.getSettings });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("vrtech-admin-content-tab") || "preview";
  });
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  const sections = sectionsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const settings = settingsQuery.data;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductSection | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductSection | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const loading = sectionsQuery.isLoading || productsQuery.isLoading || settingsQuery.isLoading;
  const error = sectionsQuery.error ?? productsQuery.error ?? settingsQuery.error;

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return sections;
    }
    return sections.filter((section) => {
      const blob = `${section.title} ${section.subtitle ?? ""} ${section.sectionType} ${section.selectionMode}`.toLowerCase();
      return blob.includes(query);
    });
  }, [search, sections]);

  const activeSections = sections.filter((section) => section.active).length;
  const scheduledSections = sections.filter(
    (section) =>
      resolvePublishWorkflowStatus({
        active: section.active,
        startAt: section.startAt,
        endAt: section.endAt,
        inactiveLabel: "UNPUBLISHED"
      }) === "SCHEDULED"
  ).length;
  const unpublishedSections = sections.filter(
    (section) =>
      resolvePublishWorkflowStatus({
        active: section.active,
        startAt: section.startAt,
        endAt: section.endAt,
        inactiveLabel: "UNPUBLISHED"
      }) === "UNPUBLISHED"
  ).length;
  const resolvedProducts = sections.reduce((total, section) => total + (section.resolvedProducts?.length ?? 0), 0);
  const includeDefaultHomeSections = settings?.includeDefaultHomeSections !== false;
  const selectedDefaultHomeSections = parseDefaultHomeSectionTypes(settings?.defaultHomeSectionTypes);

  function scrollToEditor() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startAddSection() {
    setSelected(null);
    setForm({ ...emptyForm, displayOrder: String(sections.length) });
    setEditorOpen(true);
    scrollToEditor();
  }

  function startEdit(section: ProductSection) {
    setSelected(section);
    setForm(sectionToForm(section));
    setEditorOpen(true);
    scrollToEditor();
  }

  function closeEditor() {
    setSelected(null);
    setForm(emptyForm);
    setEditorOpen(false);
  }

  function toggleProduct(productId: number) {
    setForm((current) => {
      const exists = current.productIds.includes(productId);
      return {
        ...current,
        productIds: exists ? current.productIds.filter((id) => id !== productId) : [...current.productIds, productId]
      };
    });
  }

  function moveProduct(productId: number, direction: -1 | 1) {
    setForm((current) => {
      const index = current.productIds.indexOf(productId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.productIds.length) {
        return current;
      }
      const next = [...current.productIds];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, productIds: next };
    });
  }

  function updateField<K extends keyof SectionForm>(key: K, value: SectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error("Section title is required");
      return;
    }

    if (form.startAt && form.endAt && Date.parse(form.endAt) < Date.parse(form.startAt)) {
      toast.error("End date must be after start date");
      return;
    }

    if (form.workflowStatus === "SCHEDULED" && !form.startAt) {
      toast.error("Scheduled sections need a future start date");
      return;
    }

    if ((form.selectionMode === "MANUAL" || form.selectionMode === "HYBRID") && !form.productIds.length) {
      toast.error("Select products for manual or hybrid sections");
      return;
    }

    const payload = {
      title,
      subtitle: form.subtitle.trim() || undefined,
      sectionType: form.sectionType,
      selectionMode: form.selectionMode,
      displayOrder: Number(form.displayOrder || "0"),
      active: form.active,
      startAt: normalizeDateTimeValue(form.startAt),
      endAt: normalizeDateTimeValue(form.endAt),
      maxProducts: Number(form.maxProducts || "8"),
      products: form.productIds.map((productId, index) => ({ productId, displayOrder: index }))
    };

    try {
      if (selected) {
        await adminApi.updateProductSection(selected.id, payload);
        toast.success("Homepage section updated");
      } else {
        await adminApi.createProductSection(payload);
        toast.success("Homepage section created");
      }
      closeEditor();
      await sectionsQuery.refetch();
    } catch (submitError) {
      toast.error(getApiErrorMessage(submitError, selected ? "Failed to update section" : "Failed to create section"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteProductSection(pendingDelete.id);
      toast.success("Homepage section deleted");
      if (selected?.id === pendingDelete.id) {
        closeEditor();
      }
      await sectionsQuery.refetch();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Failed to delete section"));
    } finally {
      setPendingDelete(null);
    }
  }

  async function saveDefaultHomeSections(nextIncludeDefaultHomeSections: boolean, nextSectionTypes = selectedDefaultHomeSections) {
    if (!settings) {
      toast.error("Settings are still loading");
      return;
    }

    setSavingDefaults(true);
    try {
      await adminApi.updateSettings({
        companyName: settings.companyName || "VR Technologies",
        supportEmail: settings.supportEmail || undefined,
        supportPhone: settings.supportPhone || undefined,
        shippingNote: settings.shippingNote || undefined,
        pickupEnabled: settings.pickupEnabled ?? true,
        deliveryEnabled: settings.deliveryEnabled ?? true,
        standardDeliveryCharge: settings.standardDeliveryCharge ?? 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        stateDeliveryCharges: settings.stateDeliveryCharges || undefined,
        stateDeliveryWindows: settings.stateDeliveryWindows || undefined,
        estimatedDeliveryDays: settings.estimatedDeliveryDays ?? 5,
        gstEnabled: settings.gstEnabled ?? true,
        gstRate: settings.gstRate ?? 18,
        gstNumber: settings.gstNumber || undefined,
        returnPolicy: settings.returnPolicy || undefined,
        defaultCity: settings.defaultCity || undefined,
        defaultState: settings.defaultState || undefined,
        mapLink: settings.mapLink || undefined,
        includeDefaultHomeSections: nextIncludeDefaultHomeSections,
        defaultHomeSectionTypes: serializeDefaultHomeSectionTypes(nextSectionTypes)
      });
      toast.success("Homepage default sections updated");
      await settingsQuery.refetch();
    } catch (settingsError) {
      toast.error(getApiErrorMessage(settingsError, "Failed to update homepage defaults"));
    } finally {
      setSavingDefaults(false);
    }
  }

  function toggleDefaultHomeSection(sectionType: ProductSectionType, checked: boolean) {
    const selectedTypes = new Set(selectedDefaultHomeSections);
    if (checked) {
      selectedTypes.add(sectionType);
    } else {
      selectedTypes.delete(sectionType);
    }
    const ordered = checked
      ? [...selectedDefaultHomeSections, sectionType].filter((value, index, values) => values.indexOf(value) === index)
      : selectedDefaultHomeSections.filter((value) => selectedTypes.has(value));
    void saveDefaultHomeSections(includeDefaultHomeSections, ordered);
  }

  function setDefaultHomeSectionOrder(sectionType: ProductSectionType, value: string) {
    const currentIndex = selectedDefaultHomeSections.indexOf(sectionType);
    if (currentIndex < 0) {
      return;
    }

    const requestedOrder = Number(value);
    if (!Number.isFinite(requestedOrder)) {
      return;
    }

    const targetIndex = Math.max(0, Math.min(selectedDefaultHomeSections.length - 1, requestedOrder - 1));
    if (targetIndex === currentIndex) {
      return;
    }

    const ordered = [...selectedDefaultHomeSections];
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    void saveDefaultHomeSections(includeDefaultHomeSections, ordered);
  }

  const headerDetails = useMemo(() => {
    switch (activeTab) {
      case "preview":
        return {
          eyebrow: "Real-Time Inspection Sandbox",
          title: "Storefront Live Preview",
          description: "Experience the storefront hierarchy exactly as your customers do. Validate layout changes instantly across all viewports."
        };
      case "banners":
        return {
          eyebrow: "Campaign Broadcasting",
          title: "Banners & Campaigns",
          description: "Create, edit, and schedule promotional campaign graphics and videos on the storefront homepage."
        };
      case "stores":
        return {
          eyebrow: "Physical Footprint",
          title: "Physical Stores Directory",
          description: "Manage physical store branches, schedules, Google reviews, and maps configurations."
        };
      case "catalog":
        return {
          eyebrow: "Catalog Structure",
          title: "Categories & Brands",
          description: "Organize product categories and partner brands to power search navigation filters."
        };
      case "shelves":
      default:
        return {
          eyebrow: "Website Orchestration",
          title: "Product Shelves CMS",
          description: "Curate the dynamic visual shelves for the storefront. The priority established here dictates the customer's shopping flow."
        };
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="admin-shell p-6">
        <SkeletonLoader lines={8} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Content manager could not be loaded"
        description={getApiErrorMessage(error, "The backend content APIs could not be loaded.")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={headerDetails.eyebrow}
        title={headerDetails.title}
        description={headerDetails.description}
        variant="premium"
        actions={
          activeTab === "shelves" ? (
            <button 
              type="button" 
              className="group flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-900 shadow-md transition-all hover:bg-blue-50" 
              onClick={startAddSection}
            >
              <Plus className="h-4 w-4" />
              Deploy Segment
            </button>
          ) : undefined
        }
      >
        {activeTab === "shelves" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Segments"
              value={String(sections.length)}
              meta="Homepage architecture"
              icon={<LayoutGrid className="h-5 w-5" />}
              variant="glass"
            />
            <StatCard
              label="Live Nodes"
              value={String(activeSections)}
              meta="Active customer shelves"
              icon={<Eye className="h-5 w-5" />}
              variant="glass"
            />
            <StatCard
              label="Scheduled"
              value={String(scheduledSections)}
              meta="Queued homepage launches"
              icon={<Boxes className="h-5 w-5" />}
              variant="glass"
            />
            <StatCard
              label="Unpublished"
              value={String(unpublishedSections)}
              meta="Hidden or ended homepage shelves"
              icon={<RotateCcw className="h-5 w-5" />}
              variant="glass"
            />
            <StatCard
              label="Broadcast Volume"
              value={String(resolvedProducts)}
              meta={includeDefaultHomeSections ? "Hybrid data sourcing" : "Exclusive data sourcing"}
              icon={<LayoutGrid className="h-5 w-5" />}
              variant="glass"
            />
          </div>
        )}
      </PageHeader>

      {/* PERSISTED HIGH-END TABS BAR */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 dark:border-white/10">
        <button
          type="button"
          onClick={() => { setActiveTab("preview"); localStorage.setItem("vrtech-admin-content-tab", "preview"); }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === "preview"
              ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          <Globe className="h-4 w-4" />
          Live Preview
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("shelves"); localStorage.setItem("vrtech-admin-content-tab", "shelves"); }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === "shelves"
              ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Product Shelves
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("banners"); localStorage.setItem("vrtech-admin-content-tab", "banners"); }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === "banners"
              ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Campaign Banners
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("stores"); localStorage.setItem("vrtech-admin-content-tab", "stores"); }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === "stores"
              ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          <MapPin className="h-4 w-4" />
          Physical Stores
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("catalog"); localStorage.setItem("vrtech-admin-content-tab", "catalog"); }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all",
            activeTab === "catalog"
              ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          )}
        >
          <Boxes className="h-4 w-4" />
          Categories & Brands
        </button>
      </div>

      {/* ACTIVE TAB CONTENT AREA */}

      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/5 dark:bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Monitor className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">Responsive Sandbox</h3>
                <p className="text-[10px] text-slate-500">Inspect real-time modifications directly inside the live storefront.</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-slate-950 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewViewport("desktop")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all",
                  previewViewport === "desktop"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport("tablet")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all",
                  previewViewport === "tablet"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Tablet className="h-3.5 w-3.5" />
                Tablet
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport("mobile")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all",
                  previewViewport === "mobile"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewKey((prev) => prev + 1)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-white/5 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </button>
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1E63F2] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/20 hover:bg-[#154ED1]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Site
              </a>
            </div>
          </div>

          <div className="flex justify-center bg-slate-900/5 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 min-h-[600px] overflow-hidden">
            <div
              className="transition-all duration-500 ease-in-out overflow-hidden rounded-2xl border-4 border-slate-900 bg-white shadow-2xl"
              style={{
                width:
                  previewViewport === "desktop"
                    ? "100%"
                    : previewViewport === "tablet"
                    ? "768px"
                    : "375px",
                height: "700px"
              }}
            >
              <iframe
                key={previewKey}
                src="http://localhost:5173"
                className="h-full w-full border-none"
                title="Live Storefront Sandbox"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "banners" && (
        <div className="admin-card-elevated p-0 bg-transparent rounded-3xl overflow-hidden shadow-none border-none">
          <BannersPage />
        </div>
      )}

      {activeTab === "stores" && (
        <div className="admin-card-elevated p-0 bg-transparent rounded-3xl overflow-hidden shadow-none border-none">
          <StoresPage />
        </div>
      )}

      {activeTab === "catalog" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="admin-card-elevated p-0 bg-transparent rounded-3xl overflow-hidden shadow-none border-none">
            <CategoriesPage isEmbedded={true} />
          </div>
          <div className="admin-card-elevated p-0 bg-transparent rounded-3xl overflow-hidden shadow-none border-none">
            <BrandsPage isEmbedded={true} />
          </div>
        </div>
      )}

      {activeTab === "shelves" && (
        <>
          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr_1.4fr]">
              <div className="border-r border-slate-100 bg-slate-50/50 p-6 dark:border-white/5 dark:bg-white/2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Protocol Configuration
                </div>
                <h2 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-white">Segment Traversal Order</h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Configure the visual stack for the storefront. The priority established here dictates the customer's navigation experience.
                </p>
                <label className="mt-4 group relative flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 dark:border-white/10 dark:bg-slate-800">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">Legacy Data Fallback</span>
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={includeDefaultHomeSections}
                        disabled={savingDefaults}
                        onChange={(event) => saveDefaultHomeSections(event.target.checked)}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-500">
                      Allow segments to dynamically populate from legacy catalogs if curation is absent.
                    </p>
                  </div>
                </label>
              </div>
              <div className="grid gap-3 p-5 md:grid-cols-2 bg-white dark:bg-slate-900">
                {defaultHomeSectionOptions.map((option) => {
                  const isActive = selectedDefaultHomeSections.includes(option.value);
                  const order = selectedDefaultHomeSections.indexOf(option.value) + 1;
                  return (
                    <label 
                      key={option.value} 
                      className={cn(
                        "relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-300",
                        isActive 
                          ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10 dark:border-blue-500/30 dark:bg-blue-500/5" 
                          : "border-slate-100 bg-white hover:border-slate-300 dark:border-white/5 dark:bg-slate-800 dark:hover:border-white/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4.5 w-4.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                        disabled={savingDefaults}
                        checked={isActive}
                        onChange={(event) => toggleDefaultHomeSection(option.value, event.target.checked)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white shadow-md">
                              {order}
                            </div>
                          )}
                          <span className="text-xs font-black text-slate-900 dark:text-white">{option.label}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">{option.description}</p>
                        {isActive && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Position</span>
                            <input
                              type="number"
                              className="h-8 w-16 rounded-lg border border-blue-200 bg-white px-2 text-center text-xs font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-blue-500/20 dark:bg-slate-900"
                              min={1}
                              max={selectedDefaultHomeSections.length}
                              disabled={savingDefaults}
                              value={order}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => setDefaultHomeSectionOrder(option.value, event.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          <Paper component="section" elevation={0} className="admin-card-elevated overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/5">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">Homepage shelves</h2>
                <p className="mt-0.5 text-xs text-slate-500">Manage title, order, visibility, selection mode, and curated products.</p>
              </div>
              <div className="flex min-w-[240px] flex-wrap items-center gap-2">
                <label className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="admin-input !h-9 pl-9 pr-3 rounded-lg text-xs"
                    placeholder="Search shelves..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <Button
                  disableElevation
                  variant="contained"
                  startIcon={<Plus className="h-3.5 w-3.5" />}
                  className="!h-9 !rounded-lg !bg-[#1E63F2] !px-3 !text-xs !font-bold !normal-case hover:!bg-[#154ED1]"
                  onClick={startAddSection}
                >
                  Add
                </Button>
              </div>
            </div>

            {!filteredSections.length ? (
              <div className="p-4">
                <EmptyState
                  icon={<LayoutGrid className="h-6 w-6" />}
                  title={search ? "No sections match" : "No shelves yet"}
                  description="Create product sections for best sellers, today's deals, and curated manual shelves."
                />
              </div>
            ) : (
              <div className="admin-scrollbar overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-white/5">
                    <tr>
                      <th className="px-5 py-3">Section</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredSections.map((section) => (
                      <tr key={section.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-white/2">
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{section.title}</div>
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{section.subtitle || "No subtitle"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Chip className="!h-6 !rounded-md !bg-blue-50 !px-1.5 !text-[10px] !font-bold !text-[#1E63F2] dark:!bg-blue-500/10 dark:!text-blue-400" label={labelForType(section.sectionType)} />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{section.selectionMode}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{section.resolvedProducts?.length ?? 0}</div>
                          <div className="text-[10px] text-slate-400">Max {section.maxProducts}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{section.displayOrder}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const appearance = workflowAppearance(
                              resolvePublishWorkflowStatus({
                                active: section.active,
                                startAt: section.startAt,
                                endAt: section.endAt,
                                inactiveLabel: "UNPUBLISHED"
                              })
                            );
                            return <span className={appearance.className}>{appearance.label}</span>;
                          })()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Tooltip title="Edit">
                              <IconButton className="!h-8 !w-8 !border !border-blue-100 !text-[#1E63F2] hover:!bg-blue-50 dark:!border-blue-500/20" onClick={() => startEdit(section)}>
                                <PencilLine className="h-3.5 w-3.5" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton className="!h-8 !w-8 !border !border-red-100 !text-red-600 hover:!bg-red-50 dark:!border-red-500/20" onClick={() => setPendingDelete(section)}>
                                <Trash2 className="h-3.5 w-3.5" />
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

          {editorOpen ? (
            <Paper
              component="form"
              elevation={0}
              ref={formRef}
              className="admin-card-elevated mx-auto max-w-4xl space-y-4 p-5 scroll-mt-24 border border-slate-200/50 dark:border-white/5 rounded-2xl"
              onSubmit={handleSubmit}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="admin-pill text-[10px] py-0.5 px-2">{selected ? "Edit Section" : "New Section"}</div>
                  <h2 className="mt-2 text-base font-black text-slate-900 dark:text-white">
                    {selected ? "Update homepage shelf" : "Create homepage shelf"}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Use automatic shelves for backend-driven products, or manual/hybrid shelves when the website needs curated ordering.
                  </p>
                </div>
                <Tooltip title="Close">
                  <IconButton className="!h-9 !w-9 !border !border-slate-200 !text-slate-600 hover:!bg-slate-50 dark:!border-white/10 dark:!text-slate-400" onClick={closeEditor}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </IconButton>
                </Tooltip>
              </div>

              <div className="grid gap-3.5 lg:grid-cols-2">
                <AdminInput label="Title" placeholder="Best selling laptops" value={form.title} onChange={(value) => updateField("title", value)} />
                <AdminInput label="Subtitle" placeholder="Customer favorites from all branches" value={form.subtitle} onChange={(value) => updateField("subtitle", value)} />
                <AdminSelect
                  label="Section type"
                  value={form.sectionType}
                  onChange={(value) => updateField("sectionType", value as ProductSectionType)}
                  options={sectionTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
                />
                <AdminSelect
                  label="Selection mode"
                  value={form.selectionMode}
                  onChange={(value) => updateField("selectionMode", value as ProductSectionSelectionMode)}
                  options={[
                    { label: "Automatic", value: "AUTOMATIC" },
                    { label: "Manual", value: "MANUAL" },
                    { label: "Hybrid", value: "HYBRID" }
                  ]}
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:col-span-2 dark:border-white/5 dark:bg-white/2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Selection mode meaning</div>
                  <div className="mt-1.5 grid gap-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 md:grid-cols-3">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-white">Automatic:</span> backend chooses products for this shelf from rules like featured, deals, newest, or best seller data.
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-white">Manual:</span> only the products you select below appear, in your selected product order.
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 dark:text-white">Hybrid:</span> selected products appear first, then backend fills remaining slots automatically.
                    </div>
                  </div>
                </div>
                <AdminInput label="Display order" placeholder="0" value={form.displayOrder} onChange={(value) => updateField("displayOrder", value.replace(/[^0-9]/g, ""))} />
                <AdminInput label="Max products" placeholder="8" value={form.maxProducts} onChange={(value) => updateField("maxProducts", value.replace(/[^0-9]/g, ""))} />
                <AdminSelect
                  label="Publish workflow"
                  value={form.workflowStatus}
                  onChange={(value) =>
                    setForm((current) => applyWorkflowStatus({ ...current, workflowStatus: value as PublishWorkflowStatus }, value as PublishWorkflowStatus))
                  }
                  options={publishWorkflowOptions.map((option) => ({ label: option.label, value: option.value }))}
                />
                <AdminInput label="Start date" type="datetime-local" value={form.startAt} onChange={(value) => updateField("startAt", value)} />
                <AdminInput label="End date" type="datetime-local" value={form.endAt} onChange={(value) => updateField("endAt", value)} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-white/5 dark:bg-white/2">
                Workflow status decides whether the homepage section stays in draft, publishes immediately, waits for a scheduled window, or remains unpublished.
              </div>

              {form.selectionMode !== "AUTOMATIC" ? (
                <ProductPicker products={products} selectedIds={form.productIds} onMove={moveProduct} onToggle={toggleProduct} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500 dark:border-white/5 dark:bg-white/2">
                  Automatic mode uses backend rules for {labelForType(form.sectionType).toLowerCase()} and does not require manual product selection.
                </div>
              )}

              <Button
                disableElevation
                type="submit"
                variant="contained"
                className="!h-10 !w-full !rounded-xl !bg-[#1E63F2] !py-2.5 !text-xs !font-extrabold !normal-case hover:!bg-[#154ED1]"
              >
                {selected ? "Update section" : "Create section"}
              </Button>
            </Paper>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.title}?` : "Delete section?"}
        description="This removes the homepage product section from the admin content manager and public homepage feed."
        confirmLabel="Delete section"
        tone="danger"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="admin-shell-muted min-w-[130px] p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="admin-display mt-2 text-3xl font-black text-slate-950">{value}</div>
    </article>
  );
}

function AdminInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="admin-section-label">{label}</span>
      <input className="admin-input mt-1" placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="admin-section-label">{label}</span>
      <select className="admin-select mt-1" value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductPicker({
  onMove,
  onToggle,
  products,
  selectedIds
}: {
  onMove: (productId: number, direction: -1 | 1) => void;
  onToggle: (productId: number) => void;
  products: Product[];
  selectedIds: number[];
}) {
  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="admin-section-label">Manual products</div>
          <p className="mt-1 text-sm text-slate-500">Select products and use the order list to control storefront sequence.</p>
        </div>
        <Chip className="!rounded-full !bg-white !font-bold !text-slate-600" label={`${selectedIds.length} selected`} />
      </div>

      {selectedProducts.length ? (
        <div className="mt-4 space-y-2">
          {selectedProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-[#1E63F2]">{index + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-950">{product.title}</div>
                <div className="text-xs text-slate-500">{product.brandName ?? "No brand"} / {product.sku ?? `#${product.id}`}</div>
              </div>
              <Tooltip title="Move">
                <span className="flex gap-1">
                  <IconButton className="!h-9 !w-9" disabled={index === 0} onClick={() => onMove(product.id, -1)}>
                    <ArrowUpDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton className="!h-9 !w-9" disabled={index === selectedProducts.length - 1} onClick={() => onMove(product.id, 1)}>
                    <ArrowUpDown className="h-4 w-4 rotate-180" />
                  </IconButton>
                </span>
              </Tooltip>
              <Button className="!rounded-xl !text-red-600" onClick={() => onToggle(product.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {products.map((product) => {
          const active = selectedIds.includes(product.id);
          return (
            <button
              key={product.id}
              type="button"
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                active ? "border-blue-300 bg-blue-50 text-[#1E63F2]" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
              }`}
              onClick={() => onToggle(product.id)}
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {product.images?.[0]?.imageUrl ? (
                  <img src={product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Boxes className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{product.title}</div>
                <div className="truncate text-xs opacity-70">{product.brandName ?? "No brand"}</div>
              </div>
              {active ? <Eye className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
