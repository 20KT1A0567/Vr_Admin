import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Button, Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ImagePlus, PencilLine, Plus, RotateCcw, Save, Search, Tags, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { CompareFieldsSelector } from "components/admin/CompareFieldsSelector";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import type { Category } from "types";
import { cn } from "utils/cn";

type CategoryFormState = {
  name: string;
  slug: string;
  iconUrl: string;
  compareFields: string;
};

type EditorMode = "list" | "create" | "edit";

const emptyForm: CategoryFormState = { name: "", slug: "", iconUrl: "", compareFields: "" };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function summarizeDescription(category: Category): string {
  const raw = category.compareFields?.trim();
  if (!raw) {
    return "-";
  }
  const compact = raw.replace(/\s+/g, " ");
  return compact.length <= 96 ? compact : `${compact.slice(0, 96)}...`;
}

interface CategoriesPageProps {
  isEmbedded?: boolean;
}

export function CategoriesPage({ isEmbedded = false }: CategoriesPageProps) {
  const { data: categories = [], refetch } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("list");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((category) => {
      const blob = `${category.name} ${category.slug} ${category.compareFields ?? ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [categories, search]);

  const stats = useMemo(() => ({
    total: categories.length,
    withIcons: categories.filter(c => c.iconUrl).length,
    withFields: categories.filter(c => c.compareFields?.trim()).length
  }), [categories]);

  function closeEditor() {
    setSelected(null);
    setForm(emptyForm);
    setEditorMode("list");
  }

  function startAddCategory() {
    setSelected(null);
    setForm(emptyForm);
    setEditorMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(category: Category) {
    setSelected(category);
    setForm({
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl ?? "",
      compareFields: category.compareFields ?? ""
    });
    setEditorMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "catalog");
      setForm((current) => ({ ...current, iconUrl: uploaded.url }));
      toast.success("Icon uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload icon"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    const payload = {
      name,
      slug: form.slug.trim() || slugify(name),
      iconUrl: form.iconUrl.trim() || undefined,
      compareFields: form.compareFields.trim() || undefined
    };

    setSaving(true);
    try {
      if (selected) {
        await adminApi.updateCategory(selected.id, payload);
        toast.success("Category updated");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Category created");
      }
      closeEditor();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update category" : "Failed to create category"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteCategory(pendingDelete.id);
      toast.success("Category deleted");
      if (selected?.id === pendingDelete.id) {
        closeEditor();
      }
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete category"));
    } finally {
      setPendingDelete(null);
    }
  }

  if (editorMode !== "list") {
    const isEdit = editorMode === "edit";

    return (
      <div className="space-y-6">
        <Paper component="section" elevation={0} className="admin-card-elevated overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Button
                disableElevation
                type="button"
                variant="outlined"
                startIcon={<ArrowLeft className="h-4 w-4" />}
                className="!mb-5 !h-11 !rounded-2xl !border-slate-300 !px-4 !font-bold !normal-case !text-slate-700 hover:!bg-slate-50"
                onClick={closeEditor}
              >
                Back to categories
              </Button>
              <Chip
                className="!h-10 !rounded-full !border-blue-200 !bg-blue-50 !px-2 !font-extrabold !uppercase !tracking-[0.14em] !text-[#1E63F2]"
                label={isEdit ? "Edit category" : "New category"}
                variant="outlined"
              />
              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                {isEdit ? `Update ${selected?.name ?? "category"}` : "Create category"}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                Manage navigation details, storefront icon, and compare fields in a dedicated category editor.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#1E63F2]">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-950">{categories.length} categories</div>
                  <div>Catalog navigation</div>
                </div>
              </div>
            </div>
          </div>
        </Paper>

        <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit}>
          <Paper component="section" elevation={0} className="admin-card-elevated space-y-6 p-6">
            <div className="space-y-5">
              <CategoryInput
                label="Name"
                placeholder="Laptops"
                value={form.name}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                    slug: isEdit ? current.slug : slugify(value)
                  }))
                }
              />
              <CategoryInput
                label="Slug"
                placeholder="laptops"
                value={form.slug}
                onChange={(value) => setForm((current) => ({ ...current, slug: value }))}
              />
            </div>

            <CompareFieldsSelector value={form.compareFields} onChange={(compareFields) => setForm((current) => ({ ...current, compareFields }))} />
          </Paper>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Paper component="section" elevation={0} className="admin-card-elevated p-5">
              <div className="admin-section-label">Category icon</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Recommended 200 x 200 PNG for navigation and category tiles.
              </p>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                {form.iconUrl ? (
                  <div className="space-y-4">
                    <img src={form.iconUrl} alt="Icon preview" className="mx-auto h-32 w-32 rounded-full border border-slate-200 bg-white object-cover" />
                    <p className="break-all text-xs leading-5 text-slate-500">{form.iconUrl}</p>
                    <Button className="!rounded-xl !text-red-600" onClick={() => setForm((current) => ({ ...current, iconUrl: "" }))}>
                      Remove icon
                    </Button>
                  </div>
                ) : (
                  <div className="grid min-h-[11rem] place-items-center px-6 text-center text-sm leading-6 text-slate-400">
                    Upload an icon to preview the category tile and storefront badge.
                  </div>
                )}
              </div>

              <Button
                component="label"
                disableElevation
                variant="outlined"
                startIcon={<ImagePlus className="h-4 w-4" />}
                className="!mt-4 !h-12 !w-full !rounded-2xl !border-slate-300 !px-5 !font-bold !normal-case !text-slate-700 hover:!bg-white"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : form.iconUrl ? "Change icon" : "Upload icon"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </Button>
            </Paper>

            <Paper component="section" elevation={0} className="admin-card-elevated space-y-3 p-5">
              <Button
                disableElevation
                className="!h-14 !w-full !rounded-[28px] !bg-[#1E63F2] !text-base !font-extrabold !normal-case !text-white hover:!bg-[#154ED1]"
                disabled={uploading || saving}
                type="submit"
                variant="contained"
                startIcon={isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              >
                {saving ? "Saving..." : isEdit ? "Update category" : "Create category"}
              </Button>
              <Button
                disableElevation
                type="button"
                variant="outlined"
                startIcon={<RotateCcw className="h-4 w-4" />}
                className="!h-12 !w-full !rounded-2xl !border-slate-300 !font-bold !normal-case !text-slate-700 hover:!bg-slate-50"
                onClick={closeEditor}
              >
                Cancel
              </Button>
            </Paper>
          </aside>
        </form>

        <ConfirmDialog
          open={pendingDelete != null}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
          title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete category?"}
          description="This removes the category record from the admin catalog. Products using it may need reassignment."
          confirmLabel="Delete category"
          tone="danger"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", isEmbedded && "space-y-0")}>
      {!isEmbedded && (
        <PageHeader
          eyebrow="Intelligence Center"
          title="Category Catalog"
          description="Structure the global ecosystem. Categories define navigation topology and structured field availability."
          variant="premium"
          actions={
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
              onClick={startAddCategory}
            >
              <Plus className="h-4 w-4" />
              Define Node
            </button>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Logical Segments"
              value={String(categories.length)}
              meta="Active navigation paths"
              icon={<Tags className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Node Velocity"
              value="Stable"
              meta="No recent topology changes"
              icon={<RotateCcw className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Data Integrity"
              value="100%"
              meta="All fields synchronized"
              icon={<Check className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Ecosystem Tier"
              value="Enterprise"
              meta="High-density architecture"
              icon={<Zap className="h-6 w-6" />}
              variant="glass"
            />
          </div>
        </PageHeader>
      )}

      <section className={cn("admin-card-elevated border-none bg-white p-0 overflow-hidden shadow-2xl dark:bg-slate-900", isEmbedded && "rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-xl")}>
        {isEmbedded ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-5 dark:border-white/5 dark:bg-white/2">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Category Catalog</h2>
              <p className="mt-0.5 text-xs text-slate-500">Structure navigation topology and fields</p>
            </div>
            <button 
              type="button" 
              className="flex items-center gap-2 rounded-xl bg-[#1E63F2] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#154ED1] transition-all"
              onClick={startAddCategory}
            >
              <Plus className="h-4 w-4" />
              Define Node
            </button>
          </div>
        ) : null}

        <div className={cn("flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-10 py-6 dark:border-white/5 dark:bg-white/2", isEmbedded && "bg-white px-8 py-4 dark:bg-slate-900")}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={cn("admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-14 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5", isEmbedded && "!h-12 !rounded-xl")}
              placeholder={isEmbedded ? "Search categories..." : "Search category identity, slug, or protocol definition..."}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {!isEmbedded && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Tags className="h-5 w-5" />
            </div>
          )}
        </div>

        {!filtered.length ? (
          <div className={cn("p-20 text-center", isEmbedded && "p-12")}>
            <EmptyState
              icon={<Tags className="h-8 w-8" />}
              title="No fragments found"
              description="Define the logical structure of your catalog to enable advanced commerce features."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5">
                <tr>
                  <th className={cn("px-10 py-5", isEmbedded && "px-8 py-4")}>Visual Identity</th>
                  <th className={cn("px-10 py-5", isEmbedded && "px-8 py-4")}>Nomenclature</th>
                  {!isEmbedded && <th className="px-10 py-5">Metadata definition</th>}
                  {!isEmbedded && <th className="px-10 py-5">Status</th>}
                  <th className={cn("px-10 py-5 text-right", isEmbedded && "px-8 py-4")}>Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((category) => (
                  <tr key={category.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-white/2">
                    <td className={cn("px-10 py-6", isEmbedded && "px-8 py-4")}>
                      <div className={cn("flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-100 shadow-inner dark:bg-white/5", isEmbedded && "h-12 w-12 rounded-xl")}>
                        {category.iconUrl ? (
                          <img src={category.iconUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Tags className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className={cn("px-10 py-6", isEmbedded && "px-8 py-4")}>
                      <div className={cn("text-lg font-black tracking-tight text-slate-900 dark:text-white", isEmbedded && "text-base")}>{category.name}</div>
                      <div className={cn("mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-500", isEmbedded && "mt-0.5 text-[9px]")}>{category.slug}</div>
                    </td>
                    {!isEmbedded && (
                      <td className="px-10 py-6 max-w-md">
                        <span className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{summarizeDescription(category)}</span>
                      </td>
                    )}
                    {!isEmbedded && (
                      <td className="px-10 py-6">
                        <Chip className="!h-9 !rounded-full !border-green-200 !bg-green-50 !px-2 !font-bold !text-green-700" label="Active" variant="outlined" />
                      </td>
                    )}
                    <td className={cn("px-5 py-4", isEmbedded && "px-8 py-4")}>
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Edit">
                          <IconButton className={cn("!h-11 !w-11 !border !border-blue-200 !text-[#1E63F2] hover:!border-[#1E63F2] hover:!bg-blue-50", isEmbedded && "!h-9 !w-9")} onClick={() => startEdit(category)}>
                            <PencilLine className={cn("h-5 w-5", isEmbedded && "h-4.5 w-4.5")} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton className={cn("!h-11 !w-11 !border !border-red-200 !text-red-600 hover:!bg-red-50", isEmbedded && "!h-9 !w-9")} onClick={() => setPendingDelete(category)}>
                            <Trash2 className={cn("h-5 w-5", isEmbedded && "h-4.5 w-4.5")} />
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
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete category?"}
        description="This removes the category record from the admin catalog. Products using it may need reassignment."
        confirmLabel="Delete category"
        tone="danger"
      />
    </div>
  );
}

function CategoryInput({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="admin-section-label">{label}</span>
      <input
        className="mt-2 h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition placeholder:text-slate-400 focus:border-[#1E63F2] focus:ring-4 focus:ring-blue-100"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
