import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Button, Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Boxes, Eye, LayoutGrid, PencilLine, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import type { Product, ProductSection, ProductSectionSelectionMode, ProductSectionType } from "types";

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
  active: true,
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
    <div className="space-y-6">
      <Paper component="section" elevation={0} className="admin-shell overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-5 p-6 lg:p-7">
          <div className="max-w-3xl">
            <div className="admin-pill">Website Content</div>
            <h1 className="admin-display mt-4 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">
              Homepage section manager
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Control the product shelves shown on the customer homepage. These sections feed the website through the real public home-sections API.
            </p>
            <Button
              disableElevation
              variant="contained"
              startIcon={<Plus className="h-4 w-4" />}
              className="!mt-5 !h-12 !rounded-xl !bg-[#1E63F2] !px-5 !font-extrabold !normal-case hover:!bg-[#154ED1]"
              onClick={startAddSection}
            >
              Create Section
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Sections" value={sections.length} />
            <Metric label="Active" value={activeSections} />
            <Metric label="Products shown" value={resolvedProducts} />
          </div>
        </div>
      </Paper>

      <Paper component="section" elevation={0} className="admin-card-elevated overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.4fr] lg:p-6">
          <div>
            <div className="admin-pill">Homepage Sections</div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">Website homepage order</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose which homepage shelves are visible. The selected order here is the order used on the customer website.
            </p>
            <label className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span>
                <span className="block text-sm font-black text-slate-950">Use default product data when needed</span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">When enabled, selected shelves can fall back to old/default product data if no admin section exists.</span>
              </span>
              <input
                type="checkbox"
                className="mt-1"
                checked={includeDefaultHomeSections}
                disabled={savingDefaults}
                onChange={(event) => saveDefaultHomeSections(event.target.checked)}
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {defaultHomeSectionOptions.map((option) => (
              <label key={option.value} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={savingDefaults}
                  checked={selectedDefaultHomeSections.includes(option.value)}
                  onChange={(event) => toggleDefaultHomeSection(option.value, event.target.checked)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-black text-slate-950">
                    {selectedDefaultHomeSections.includes(option.value) ? (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-50 px-2 text-xs text-[#1E63F2]">
                        {selectedDefaultHomeSections.indexOf(option.value) + 1}
                      </span>
                    ) : null}
                    {option.label}
                  </span>
                  <span className="mt-1 block leading-5 text-slate-500">{option.description}</span>
                </span>
                {selectedDefaultHomeSections.includes(option.value) ? (
                  <span className="shrink-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Order</span>
                    <input
                      type="number"
                      className="mt-1 h-9 w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-sm font-black text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
                      min={1}
                      max={selectedDefaultHomeSections.length}
                      disabled={savingDefaults}
                      value={selectedDefaultHomeSections.indexOf(option.value) + 1}
                      onClick={(event) => event.preventDefault()}
                      onChange={(event) => setDefaultHomeSectionOrder(option.value, event.target.value)}
                    />
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      </Paper>

      <Paper component="section" elevation={0} className="admin-card-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">Homepage shelves</h2>
            <p className="mt-1 text-sm text-slate-500">Manage title, order, visibility, selection mode, and curated products.</p>
          </div>
          <div className="flex min-w-[260px] flex-wrap items-center gap-3">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="admin-input pl-11"
                placeholder="Search sections"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <Button
              disableElevation
              variant="contained"
              startIcon={<Plus className="h-4 w-4" />}
              className="!h-11 !rounded-xl !bg-[#1E63F2] !px-4 !font-bold !normal-case hover:!bg-[#154ED1]"
              onClick={startAddSection}
            >
              Add
            </Button>
          </div>
        </div>

        {!filteredSections.length ? (
          <div className="p-6">
            <EmptyState
              icon={<LayoutGrid className="h-7 w-7" />}
              title={search ? "No sections match the search" : "No homepage sections yet"}
              description="Create product sections for best sellers, today's deals, new arrivals, and curated manual shelves."
            />
          </div>
        ) : (
          <div className="admin-scrollbar overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="admin-table-head">
                <tr>
                  <th className="px-5 py-4">Section</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Mode</th>
                  <th className="px-4 py-4">Products</th>
                  <th className="px-4 py-4">Order</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section) => (
                  <tr key={section.id} className="admin-table-row">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{section.title}</div>
                      <div className="mt-1 line-clamp-1 text-xs text-slate-500">{section.subtitle || "No subtitle"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Chip className="!rounded-full !bg-blue-50 !font-bold !text-[#1E63F2]" label={labelForType(section.sectionType)} />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{section.selectionMode}</td>
                    <td className="px-4 py-4">
                      <div className="font-black text-slate-950">{section.resolvedProducts?.length ?? 0}</div>
                      <div className="text-xs text-slate-500">Max {section.maxProducts}</div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{section.displayOrder}</td>
                    <td className="px-4 py-4">
                      <span className={section.active ? "admin-badge-green" : "admin-badge-slate"}>{section.active ? "Active" : "Hidden"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Edit section">
                          <IconButton className="!h-10 !w-10 !border !border-blue-200 !text-[#1E63F2] hover:!bg-blue-50" onClick={() => startEdit(section)}>
                            <PencilLine className="h-4 w-4" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete section">
                          <IconButton className="!h-10 !w-10 !border !border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => setPendingDelete(section)}>
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

      {editorOpen ? (
        <Paper
          component="form"
          elevation={0}
          ref={formRef}
          className="admin-card-elevated mx-auto max-w-5xl space-y-6 p-6 scroll-mt-24"
          onSubmit={handleSubmit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="admin-pill">{selected ? "Edit Section" : "New Section"}</div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                {selected ? "Update homepage shelf" : "Create homepage shelf"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use automatic shelves for backend-driven products, or manual/hybrid shelves when the website needs curated ordering.
              </p>
            </div>
            <Tooltip title="Close form">
              <IconButton className="!h-11 !w-11 !border !border-slate-200 !text-slate-600 hover:!bg-slate-50" onClick={closeEditor}>
                <RotateCcw className="h-4 w-4" />
              </IconButton>
            </Tooltip>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <div className="admin-section-label">Selection mode meaning</div>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
                <div>
                  <span className="font-black text-slate-950">Automatic:</span> backend chooses products for this shelf from rules like featured, deals, newest, or best seller data.
                </div>
                <div>
                  <span className="font-black text-slate-950">Manual:</span> only the products you select below appear, in your selected product order.
                </div>
                <div>
                  <span className="font-black text-slate-950">Hybrid:</span> selected products appear first, then backend fills remaining slots automatically up to max products.
                </div>
              </div>
            </div>
            <AdminInput label="Display order" placeholder="0" value={form.displayOrder} onChange={(value) => updateField("displayOrder", value.replace(/[^0-9]/g, ""))} />
            <AdminInput label="Max products" placeholder="8" value={form.maxProducts} onChange={(value) => updateField("maxProducts", value.replace(/[^0-9]/g, ""))} />
            <AdminInput label="Start date" type="datetime-local" value={form.startAt} onChange={(value) => updateField("startAt", value)} />
            <AdminInput label="End date" type="datetime-local" value={form.endAt} onChange={(value) => updateField("endAt", value)} />
          </div>

          <label className="admin-check-card cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(event) => updateField("active", event.target.checked)} />
            Show this section on the website when schedule rules allow it
          </label>

          {form.selectionMode !== "AUTOMATIC" ? (
            <ProductPicker products={products} selectedIds={form.productIds} onMove={moveProduct} onToggle={toggleProduct} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Automatic mode uses backend rules for {labelForType(form.sectionType).toLowerCase()} and does not require manual product selection.
            </div>
          )}

          <Button
            disableElevation
            type="submit"
            variant="contained"
            className="!h-13 !w-full !rounded-xl !bg-[#1E63F2] !py-3 !font-extrabold !normal-case hover:!bg-[#154ED1]"
          >
            {selected ? "Update section" : "Create section"}
          </Button>
        </Paper>
      ) : null}

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
