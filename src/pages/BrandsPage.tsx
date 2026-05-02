import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid3x3, LayoutList, PencilLine, Plus, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { FileUploadCard } from "components/admin/FileUploadCard";
import type { Brand } from "types";

type BrandFormState = {
  name: string;
  logoUrl: string;
};

const emptyForm: BrandFormState = { name: "", logoUrl: "" };

export function BrandsPage() {
  const { data: brands = [], refetch } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brands, search]);

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function startEdit(brand: Brand) {
    setSelected(brand);
    setForm({ name: brand.name, logoUrl: brand.logoUrl ?? "" });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "catalog");
      setForm((current) => ({ ...current, logoUrl: uploaded.url }));
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Brand name is required");
      return;
    }

    const duplicate = brands.some(
      (brand) => brand.id !== selected?.id && brand.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error("Brand name already exists");
      return;
    }

    const payload = { name, logoUrl: form.logoUrl.trim() || undefined };

    try {
      if (selected) {
        await adminApi.updateBrand(selected.id, payload);
        toast.success("Brand updated");
      } else {
        await adminApi.createBrand(payload);
        toast.success("Brand created");
      }
      resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update brand" : "Failed to create brand"));
    }
  }

  async function handleDelete(brand: Brand) {
    setPendingDelete(brand);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteBrand(pendingDelete.id);
      toast.success("Brand deleted");
      if (selected?.id === pendingDelete.id) resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete brand"));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Brands</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">Brand master</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage manufacturers behind your catalog. Brand logos appear on listings, product detail pages, and storefront filters.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Total brands</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{brands.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">With logo</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">
                {brands.filter((brand) => Boolean(brand.logoUrl)).length}
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
                  placeholder="Search brand by name"
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
              icon={<ShieldCheck className="h-7 w-7" />}
              title={search ? "No brands match the search" : "No brands created yet"}
              description="Add brand records to power storefront filters, product chips, and richer catalog presentation."
            />
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((brand) => (
                <article key={brand.id} className="admin-card p-5">
                  <div className="flex aspect-[4/2] items-center justify-center overflow-hidden rounded-[1rem] border border-slate-100 bg-slate-50">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="max-h-20 max-w-[80%] object-contain" />
                    ) : (
                      <ShieldCheck className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-950">{brand.name}</h3>
                      <div className="mt-1 text-xs text-slate-500">ID #{brand.id}</div>
                    </div>
                    <span className="admin-badge-green">Active</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button type="button" className="admin-icon-button" onClick={() => startEdit(brand)} aria-label="Edit">
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button type="button" className="admin-icon-button-danger" onClick={() => handleDelete(brand)} aria-label="Delete">
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
                      <th className="px-5 py-3">Brand</th>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((brand) => (
                      <tr key={brand.id} className="admin-table-row">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                              {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt={brand.name} className="max-h-10 max-w-full object-contain" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-slate-300" />
                              )}
                            </div>
                            <div className="font-medium text-slate-900">{brand.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">#{brand.id}</td>
                        <td className="px-3 py-3"><span className="admin-badge-green">Active</span></td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="admin-icon-button" onClick={() => startEdit(brand)} aria-label="Edit">
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button type="button" className="admin-icon-button-danger" onClick={() => handleDelete(brand)} aria-label="Delete">
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
              <div className="admin-pill">{selected ? "Edit brand" : "New brand"}</div>
              <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">
                {selected ? "Update brand" : "Add a brand"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">Use the brand record across catalog filters and storefront listings.</p>
            </div>
            {selected ? (
              <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="New">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div>
            <label className="admin-section-label">Name</label>
            <input
              className="admin-input mt-1"
              placeholder="Brand name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <FileUploadCard
            title="Brand logo"
            description="Transparent PNG works best. This preview is used across product cards, brand shelves, and catalog filters."
            uploading={uploading}
            valueLabel={form.logoUrl ? "Logo ready" : undefined}
            onChange={handleUpload}
            preview={
              form.logoUrl ? (
                <div className="flex min-h-[11rem] items-center gap-3 p-4">
                  <img src={form.logoUrl} alt="Logo preview" className="h-20 w-28 rounded-[22px] border border-slate-100 object-contain p-2" />
                  <button
                    type="button"
                    className="admin-button-secondary !px-3 !py-2 text-xs"
                    onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="admin-upload-placeholder">
                  Upload a logo to preview the brand badge and storefront chip.
                </div>
              )
            }
          />

          <button className="admin-button w-full" disabled={uploading}>
            {selected ? "Update brand" : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create brand
              </>
            )}
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete brand?"}
        description="This removes the brand record from the admin catalog. Products linked to it may need reassignment."
        confirmLabel="Delete brand"
        tone="danger"
      />
    </div>
  );
}
