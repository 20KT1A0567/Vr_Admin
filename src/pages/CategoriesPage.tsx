import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid3x3, LayoutList, PencilLine, Plus, RotateCcw, Search, Tags, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { FileUploadCard } from "components/admin/FileUploadCard";
import type { Category } from "types";

type CategoryFormState = {
  name: string;
  slug: string;
  iconUrl: string;
};

const emptyForm: CategoryFormState = { name: "", slug: "", iconUrl: "" };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CategoriesPage() {
  const { data: categories = [], refetch } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) =>
      `${category.name} ${category.slug}`.toLowerCase().includes(query)
    );
  }, [categories, search]);

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function startEdit(category: Category) {
    setSelected(category);
    setForm({ name: category.name, slug: category.slug, iconUrl: category.iconUrl ?? "" });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "catalog");
      setForm((current) => ({ ...current, iconUrl: uploaded.url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
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
      iconUrl: form.iconUrl.trim() || undefined
    };

    try {
      if (selected) {
        await adminApi.updateCategory(selected.id, payload);
        toast.success("Category updated");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Category created");
      }
      resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update category" : "Failed to create category"));
    }
  }

  async function handleDelete(category: Category) {
    setPendingDelete(category);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteCategory(pendingDelete.id);
      toast.success("Category deleted");
      if (selected?.id === pendingDelete.id) resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete category"));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Categories</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">Category master</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Organize the storefront navigation, filter facets, and homepage tiles. Each category drives the product schema fields shown to customers.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Total categories</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{categories.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">With icon</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">
                {categories.filter((category) => Boolean(category.iconUrl)).length}
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <section className="space-y-4">
          <div className="admin-shell p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="admin-input pl-11"
                  placeholder="Search categories or slug"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="admin-segmented-control">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={view === "grid" ? "admin-segmented-option admin-segmented-option-active" : "admin-segmented-option"}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={view === "list" ? "admin-segmented-option admin-segmented-option-active" : "admin-segmented-option"}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    List
                  </button>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {filtered.length} shown
                </div>
              </div>
            </div>
          </div>

          {!filtered.length ? (
            <EmptyState
              icon={<Tags className="h-7 w-7" />}
              title={search ? "No categories match the search" : "No categories created yet"}
              description="Create the top-level catalog structure here. Categories also control which structured product fields appear in the admin product editor."
            />
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((category) => (
                <article key={category.id} className="admin-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {category.iconUrl ? (
                        <img src={category.iconUrl} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <Tags className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <span className="admin-badge-green">Active</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-semibold text-slate-950">{category.name}</h3>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">/{category.slug}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => startEdit(category)}
                      aria-label="Edit"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-button-danger"
                      onClick={() => handleDelete(category)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-shell overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="admin-table-head">
                    <tr>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-3 py-3">Slug</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((category) => (
                      <tr key={category.id} className="admin-table-row">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                              {category.iconUrl ? (
                                <img src={category.iconUrl} alt={category.name} className="h-full w-full object-cover" />
                              ) : (
                                <Tags className="h-4 w-4 text-slate-300" />
                              )}
                            </div>
                            <div className="font-medium text-slate-900">{category.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs uppercase tracking-[0.18em] text-slate-500">/{category.slug}</td>
                        <td className="px-3 py-3"><span className="admin-badge-green">Active</span></td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="admin-icon-button" onClick={() => startEdit(category)} aria-label="Edit">
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button type="button" className="admin-icon-button-danger" onClick={() => handleDelete(category)} aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <form className="admin-shell space-y-5 p-6 lg:sticky lg:top-24 lg:self-start" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="admin-pill">{selected ? "Edit category" : "New category"}</div>
              <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">
                {selected ? "Update category" : "Add a category"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">Categories drive navigation and product specification fields.</p>
            </div>
            {selected ? (
              <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="New">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <label className="admin-section-label">Name</label>
              <input
                className="admin-input mt-1"
                placeholder="Laptops"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: selected ? current.slug : slugify(event.target.value)
                  }))
                }
              />
            </div>
            <div>
              <label className="admin-section-label">Slug</label>
              <input
                className="admin-input mt-1"
                placeholder="laptops"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>
          </div>

          <FileUploadCard
            title="Category icon"
            description="Recommended 200x200 PNG. This preview is reused in category cards and navigation surfaces."
            uploading={uploading}
            valueLabel={form.iconUrl ? "Icon ready" : undefined}
            onChange={handleUpload}
            preview={
              form.iconUrl ? (
                <div className="flex min-h-[11rem] items-center gap-3 p-4">
                  <img src={form.iconUrl} alt="Icon preview" className="h-20 w-20 rounded-[22px] border border-slate-100 object-cover" />
                  <button
                    type="button"
                    className="admin-button-secondary !px-3 !py-2 text-xs"
                    onClick={() => setForm((current) => ({ ...current, iconUrl: "" }))}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="admin-upload-placeholder">
                  Upload an icon to preview the category tile and storefront badge.
                </div>
              )
            }
          />

          <button className="admin-button w-full" disabled={uploading}>
            {selected ? "Update category" : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create category
              </>
            )}
          </button>
        </form>
      </div>

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
