import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Button, Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, PencilLine, Plus, RotateCcw, Save, Search, Tags, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { CompareFieldsSelector } from "components/admin/CompareFieldsSelector";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import type { Category } from "types";

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

export function CategoriesPage() {
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
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "catalog");
      setForm((current) => ({ ...current, iconUrl: uploaded.url }));
      toast.success("Category icon uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload category icon"));
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
    <div className="space-y-6">
      <Paper component="section" elevation={0} className="admin-card-elevated min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-[#1E63F2] sm:text-[1.75rem]">Categories</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {categories.length} categories - Manage your product categories
            </p>
          </div>
          <Button
            disableElevation
            type="button"
            variant="contained"
            startIcon={<Plus className="h-4 w-4" />}
            className="!h-14 !rounded-[28px] !bg-[#1E63F2] !px-7 !text-base !font-extrabold !normal-case !shadow-[0_16px_34px_rgba(30,99,242,0.26)] hover:!bg-[#154ED1]"
            onClick={startAddCategory}
          >
            Add Category
          </Button>
        </div>

        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              className="h-16 w-full rounded-[32px] border border-slate-300 bg-white pl-14 pr-5 text-lg text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1E63F2] focus:ring-4 focus:ring-blue-100"
              placeholder="Search categories by name or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {!filtered.length ? (
          <div className="px-5 py-10 sm:px-7">
            <EmptyState
              icon={<Tags className="h-7 w-7" />}
              title={search ? "No categories match the search" : "No categories created yet"}
              description="Create the top-level catalog structure here. Categories also control which structured product fields appear in the admin product editor."
            />
          </div>
        ) : (
          <div className="admin-scrollbar overflow-x-auto px-2 pb-6 pt-2 sm:px-5">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Image</th>
                  <th className="px-3 py-4">Name</th>
                  <th className="px-3 py-4">Description</th>
                  <th className="px-3 py-4">Order</th>
                  <th className="px-3 py-4">Discount</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr key={category.id} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 ring-2 ring-white">
                        {category.iconUrl ? (
                          <img src={category.iconUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Tags className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-base font-extrabold text-slate-950">{category.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{category.slug}</div>
                    </td>
                    <td className="max-w-[16rem] px-3 py-4 text-slate-600">
                      <span className="line-clamp-2 text-sm leading-snug">{summarizeDescription(category)}</span>
                    </td>
                    <td className="px-3 py-4 font-semibold text-[#1E63F2]">-</td>
                    <td className="px-3 py-4 font-semibold text-[#1E63F2]">-</td>
                    <td className="px-3 py-4">
                      <Chip className="!h-9 !rounded-full !border-green-200 !bg-green-50 !px-2 !font-bold !text-green-700" label="Active" variant="outlined" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Edit category">
                          <IconButton className="!h-11 !w-11 !border !border-blue-200 !text-[#1E63F2] hover:!border-[#1E63F2] hover:!bg-blue-50" onClick={() => startEdit(category)}>
                            <PencilLine className="h-5 w-5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete category">
                          <IconButton className="!h-11 !w-11 !border !border-red-200 !text-red-600 hover:!bg-red-50" onClick={() => setPendingDelete(category)}>
                            <Trash2 className="h-5 w-5" />
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
