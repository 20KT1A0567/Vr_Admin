import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Button, Chip, IconButton, Paper, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, PencilLine, Plus, Search, ShieldCheck, Trash2, TrendingUp, Gauge, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import type { Brand } from "types";
import { cn } from "utils/cn";

type BrandFormState = {
  active: boolean;
  description: string;
  discountPercent: string;
  logoUrl: string;
  name: string;
  sortOrder: string;
};

const emptyForm: BrandFormState = {
  active: true,
  description: "",
  discountPercent: "",
  logoUrl: "",
  name: "",
  sortOrder: "0"
};

function summarizeDescription(brand: Brand): string {
  const raw = brand.description?.trim();
  if (!raw) {
    return "-";
  }
  const compact = raw.replace(/\s+/g, " ");
  return compact.length <= 96 ? compact : `${compact.slice(0, 96)}...`;
}

function formatDiscount(value?: number) {
  return value != null && value > 0 ? `${value}%` : "-";
}

interface BrandsPageProps {
  isEmbedded?: boolean;
}

export function BrandsPage({ isEmbedded = false }: BrandsPageProps) {
  const { data: brands = [], refetch } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = brands.slice().sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0) || left.name.localeCompare(right.name));
    if (!query) {
      return sorted;
    }
    return sorted.filter((brand) => `${brand.name} ${brand.description ?? ""}`.toLowerCase().includes(query));
  }, [brands, search]);

  function openCreateEditor() {
    setSelected(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEditEditor(brand: Brand) {
    setSelected(brand);
    setForm({
      active: brand.active ?? true,
      description: brand.description ?? "",
      discountPercent: brand.discountPercent != null ? String(brand.discountPercent) : "",
      logoUrl: brand.logoUrl ?? "",
      name: brand.name,
      sortOrder: String(brand.sortOrder ?? 0)
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    setSelected(null);
    setForm(emptyForm);
    setEditorOpen(false);
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload logo"));
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

    const duplicate = brands.some((brand) => brand.id !== selected?.id && brand.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
      toast.error("Brand name already exists");
      return;
    }

    const payload = {
      active: form.active,
      description: form.description.trim() || undefined,
      discountPercent: form.discountPercent.trim() ? Number(form.discountPercent) : undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      name,
      sortOrder: Number(form.sortOrder || "0")
    };

    try {
      if (selected) {
        await adminApi.updateBrand(selected.id, payload);
        toast.success("Brand updated");
      } else {
        await adminApi.createBrand(payload);
        toast.success("Brand created");
      }
      closeEditor();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update brand" : "Failed to create brand"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteBrand(pendingDelete.id);
      toast.success("Brand deleted");
      if (selected?.id === pendingDelete.id) {
        closeEditor();
      }
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete brand"));
    } finally {
      setPendingDelete(null);
    }
  }

  if (editorOpen) {
    return (
      <div className="space-y-6">
        <Paper component="section" elevation={0} className="admin-card-elevated overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
            <div>
              <Button
                disableElevation
                type="button"
                variant="outlined"
                startIcon={<ArrowLeft className="h-4 w-4" />}
                className="!rounded-2xl !border-slate-300 !px-4 !font-bold !normal-case !text-slate-700 hover:!bg-slate-50"
                onClick={closeEditor}
              >
                Back to brands
              </Button>
              <Chip
                className="!mt-5 !h-10 !rounded-full !border-blue-200 !bg-blue-50 !px-2 !font-extrabold !uppercase !tracking-[0.14em] !text-[#1E63F2]"
                label={selected ? "Edit brand" : "New brand"}
                variant="outlined"
              />
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
                {selected ? "Update brand" : "Add a brand"}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">
                Manage logo, description, display order, brand discount, and storefront visibility from one focused screen.
              </p>
            </div>
            <Button
              disableElevation
              type="submit"
              form="brand-editor-form"
              variant="contained"
              className="!h-14 !rounded-[28px] !bg-[#1E63F2] !px-7 !text-base !font-extrabold !normal-case !shadow-[0_16px_34px_rgba(30,99,242,0.26)] hover:!bg-[#154ED1]"
              disabled={uploading}
            >
              {selected ? "Update brand" : "Post brand"}
            </Button>
          </div>
        </Paper>

        <Paper
          component="form"
          elevation={0}
          id="brand-editor-form"
          className="admin-card-elevated mx-auto w-full max-w-4xl space-y-6 p-6"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <BrandInput
              label="Name"
              placeholder="Acer"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            />
            <BrandInput
              label="Display order"
              placeholder="0"
              value={form.sortOrder}
              inputMode="numeric"
              onChange={(value) => setForm((current) => ({ ...current, sortOrder: value.replace(/[^0-9]/g, "") }))}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <BrandInput
              label="Discount"
              placeholder="10"
              suffix="%"
              value={form.discountPercent}
              inputMode="numeric"
              onChange={(value) => setForm((current) => ({ ...current, discountPercent: value.replace(/[^0-9]/g, "") }))}
            />
            <label className="admin-check-card mt-7 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Show this brand on the storefront
            </label>
          </div>

          <label className="block">
            <span className="admin-section-label">Description</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none transition placeholder:text-slate-400 focus:border-[#1E63F2] focus:ring-4 focus:ring-blue-100"
              placeholder="Short brand description for admin and storefront context"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <Paper component="section" elevation={0} className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="admin-section-label">Brand logo</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">Transparent PNG works best for product cards, brand shelves, and catalog filters.</p>
              </div>
              <Button
                component="label"
                disableElevation
                variant="outlined"
                startIcon={<ImagePlus className="h-4 w-4" />}
                className="!h-12 !rounded-2xl !border-slate-300 !px-5 !font-bold !normal-case !text-slate-700 hover:!bg-white"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : form.logoUrl ? "Change logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </Button>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              {form.logoUrl ? (
                <div className="flex min-h-[9rem] items-center gap-4">
                  <img src={form.logoUrl} alt="Logo preview" className="h-24 w-24 rounded-full border border-slate-200 object-contain p-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">Logo ready</p>
                    <p className="mt-1 break-all text-xs leading-5 text-slate-500">{form.logoUrl}</p>
                    <Button className="!mt-3 !rounded-xl !text-red-600" onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[9rem] place-items-center px-6 text-center text-sm leading-6 text-slate-400">
                  Upload a logo to preview the brand badge and storefront chip.
                </div>
              )}
            </div>
          </Paper>

          <Button
            disableElevation
            className="!h-14 !w-full !rounded-[28px] !bg-[#1E63F2] !text-base !font-extrabold !normal-case !text-white hover:!bg-[#154ED1]"
            disabled={uploading}
            type="submit"
            variant="contained"
          >
            {selected ? "Update brand" : "Post brand"}
          </Button>
        </Paper>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", isEmbedded && "space-y-0")}>
      {!isEmbedded && (
        <PageHeader
          eyebrow="Manufacturer Registry"
          title="Brand Management"
          description="Curate global manufacturer identities. Brands power catalog filtering, product affinity, and tiering logic."
          variant="premium"
          actions={
            <button 
              type="button" 
              className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
              onClick={openCreateEditor}
            >
              <Plus className="h-4 w-4" />
              Onboard Brand
            </button>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Verified Brands"
              value={String(brands.length)}
              meta="Active manufacturers"
              icon={<ShieldCheck className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Market Share"
              value="Aggregated"
              meta="Catalog distribution"
              icon={<TrendingUp className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Data Sync"
              value="Optimal"
              meta="Asset integrity verified"
              icon={<RefreshCw className="h-6 w-6" />}
              variant="glass"
            />
            <StatCard
              label="Tier Logic"
              value="Enabled"
              meta="Custom sorting active"
              icon={<Gauge className="h-6 w-6" />}
              variant="glass"
            />
          </div>
        </PageHeader>
      )}

      {isEmbedded ? null : (
        <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[640px]">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-16 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
                placeholder="Search manufacturer identity, description, or metadata..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      <section className={cn("admin-card-elevated border-none bg-white p-0 overflow-hidden shadow-2xl dark:bg-slate-900", isEmbedded && "rounded-3xl border border-slate-200/50 dark:border-white/5 shadow-xl")}>
        {isEmbedded ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-5 dark:border-white/5 dark:bg-white/2">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Brand Registry</h2>
              <p className="mt-0.5 text-xs text-slate-500">Curate manufacturer profiles and tiering</p>
            </div>
            <button 
              type="button" 
              className="flex items-center gap-2 rounded-xl bg-[#1E63F2] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#154ED1] transition-all"
              onClick={openCreateEditor}
            >
              <Plus className="h-4 w-4" />
              Onboard Brand
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-10 py-6 dark:border-white/5 dark:bg-white/2">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Manufacturer Ledger</h2>
              <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{filtered.length} Active Records</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        )}

        {isEmbedded && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-8 py-4 dark:border-white/5 dark:bg-slate-900">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="admin-input !h-12 !rounded-xl !bg-slate-50 pl-14 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
                placeholder="Search manufacturers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        )}

        {!filtered.length ? (
          <div className={cn("p-20 text-center", isEmbedded && "p-12")}>
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" />}
              title="No records found"
              description="Onboard manufacturer entities to enable advanced catalog orchestration."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5">
                <tr>
                  <th className={cn("px-10 py-5", isEmbedded && "px-8 py-4")}>Visual Identity</th>
                  <th className={cn("px-10 py-5", isEmbedded && "px-8 py-4")}>Nomenclature</th>
                  {!isEmbedded && <th className="px-10 py-5">Description</th>}
                  {!isEmbedded && <th className="px-10 py-5">Tier logic</th>}
                  {!isEmbedded && <th className="px-10 py-5">Discount</th>}
                  {!isEmbedded && <th className="px-10 py-5">Status</th>}
                  <th className={cn("px-10 py-5 text-right", isEmbedded && "px-8 py-4")}>Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((brand) => (
                  <tr key={brand.id} className="transition hover:bg-slate-50 dark:hover:bg-white/2">
                    <td className={cn("px-10 py-6", isEmbedded && "px-8 py-4")}>
                      <div className={cn("flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white shadow-inner dark:bg-white/5 p-2", isEmbedded && "h-12 w-12 rounded-xl p-1")}>
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <ShieldCheck className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className={cn("px-10 py-6", isEmbedded && "px-8 py-4")}>
                      <div className={cn("text-lg font-black tracking-tight text-slate-900 dark:text-white", isEmbedded && "text-base")}>{brand.name}</div>
                      {brand.discountPercent != null && brand.discountPercent > 0 ? (
                        <div className={cn("mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500", isEmbedded && "mt-0.5 text-[9px]")}>Save {brand.discountPercent}%</div>
                      ) : (
                        <div className={cn("mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400", isEmbedded && "mt-0.5 text-[9px]")}>UID: BRN-{brand.id}</div>
                      )}
                    </td>
                    {!isEmbedded && (
                      <td className="px-10 py-6 max-w-xs">
                        <span className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{summarizeDescription(brand)}</span>
                      </td>
                    )}
                    {!isEmbedded && (
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">Level {brand.sortOrder ?? 0}</span>
                        </div>
                      </td>
                    )}
                    {!isEmbedded && (
                      <td className="px-10 py-6">
                        <div className="text-sm font-black text-sky-500">{formatDiscount(brand.discountPercent)}</div>
                      </td>
                    )}
                    {!isEmbedded && (
                      <td className="px-10 py-6">
                        <Chip
                          className={
                            brand.active === false
                              ? "!h-9 !rounded-full !border-slate-200 !bg-slate-50 !px-2 !font-bold !text-slate-600"
                              : "!h-9 !rounded-full !border-green-200 !bg-green-50 !px-2 !font-bold !text-green-700"
                          }
                          label={brand.active === false ? "Inactive" : "Active"}
                          variant="outlined"
                        />
                      </td>
                    )}
                    <td className={cn("px-5 py-4", isEmbedded && "px-8 py-4")}>
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Edit">
                          <IconButton className={cn("!h-11 !w-11 !border !border-blue-200 !text-[#1E63F2] hover:!border-[#1E63F2] hover:!bg-blue-50", isEmbedded && "!h-9 !w-9")} onClick={() => openEditEditor(brand)}>
                            <PencilLine className={cn("h-5 w-5", isEmbedded && "h-4.5 w-4.5")} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton className={cn("!h-11 !w-11 !border !border-red-200 !text-red-600 hover:!bg-red-50", isEmbedded && "!h-9 !w-9")} onClick={() => setPendingDelete(brand)}>
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
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete brand?"}
        description="This removes the brand record from the admin catalog. Products linked to it may need reassignment."
        confirmLabel="Delete brand"
        tone="danger"
      />
    </div>
  );
}

function BrandInput({
  inputMode,
  label,
  onChange,
  placeholder,
  suffix,
  value
}: {
  inputMode?: "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="admin-section-label">{label}</span>
      <div className="relative mt-2">
        <input
          className={`h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition placeholder:text-slate-400 focus:border-[#1E63F2] focus:ring-4 focus:ring-blue-100 ${suffix ? "pr-12" : ""}`}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{suffix}</span> : null}
      </div>
    </label>
  );
}
