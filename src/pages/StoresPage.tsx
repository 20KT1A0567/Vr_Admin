import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Eye, EyeOff, MapPin, MessageCircle, PencilLine, Phone, Plus, Search, Star, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { StoreEditorDrawer, type StoreFormState } from "components/admin/StoreEditorDrawer";
import { StorePostBar } from "components/admin/StorePostBar";
import type { Store } from "types";
import { cn } from "utils/cn";
import vrTechnologiesLogo from "../assets/vr-technologies-logo.svg";

const initialFormState: StoreFormState = {
  name: "",
  address: "",
  landmark: "",
  postalCode: "",
  city: "",
  state: "Telangana",
  phone: "",
  whatsapp: "",
  timings: "",
  mapLink: "",
  imageUrl: "",
  googleRating: "",
  googleReviewCount: "",
  active: true
};

function toFormState(store: Store): StoreFormState {
  return {
    name: store.name,
    address: store.address,
    landmark: store.landmark ?? "",
    postalCode: store.postalCode ?? "",
    city: store.city,
    state: store.state,
    phone: store.phone,
    whatsapp: store.whatsapp ?? "",
    timings: store.timings ?? "",
    mapLink: store.mapLink ?? "",
    imageUrl: store.imageUrl ?? "",
    googleRating: store.googleRating != null ? String(store.googleRating) : "",
    googleReviewCount: store.googleReviewCount != null ? String(store.googleReviewCount) : "",
    active: store.active
  };
}

function toPayload(form: StoreFormState) {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    landmark: form.landmark.trim() || undefined,
    postalCode: form.postalCode.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim(),
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim() || undefined,
    timings: form.timings.trim() || undefined,
    mapLink: form.mapLink.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    googleRating: form.googleRating.trim() ? Number(form.googleRating) : undefined,
    googleReviewCount: form.googleReviewCount.trim() ? Number(form.googleReviewCount) : undefined,
    active: form.active
  };
}

export function StoresPage() {
  const { data: stores = [], refetch } = useQuery({ queryKey: ["admin-stores"], queryFn: adminApi.getStores });
  const [editorStoreId, setEditorStoreId] = useState<number | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "HIDDEN">("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Store | null>(null);

  const selectedStore = useMemo(() => stores.find((store) => store.id === editorStoreId) ?? null, [editorStoreId, stores]);
  const activeStores = stores.filter((store) => store.active).length;
  const ratedStores = stores.filter((store) => store.googleRating != null);
  const averageRating = ratedStores.length
    ? ratedStores.reduce((sum, store) => sum + (store.googleRating ?? 0), 0) / ratedStores.length
    : 0;
  const totalReviews = stores.reduce((sum, store) => sum + (store.googleReviewCount ?? 0), 0);

  const filteredStores = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stores.filter((store) => {
      const text = `${store.name} ${store.city} ${store.state} ${store.address} ${store.phone}`.toLowerCase();
      const queryMatch = !query || text.includes(query);
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && store.active) ||
        (statusFilter === "HIDDEN" && !store.active);
      return queryMatch && statusMatch;
    });
  }, [stores, search, statusFilter]);

  function resetForm() {
    setEditorStoreId(null);
    setForm(initialFormState);
    setEditorOpen(false);
  }

  function openPostStore() {
    setEditorStoreId(null);
    setForm(initialFormState);
    setEditorOpen(true);
  }

  function openEditStore(store: Store) {
    setEditorStoreId(store.id);
    setForm(toFormState(store));
    setEditorOpen(true);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "stores");
      setForm((current) => ({ ...current, imageUrl: uploaded.url }));
      toast.success("Store image uploaded");
    } catch {
      toast.error("Failed to upload store image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadingImage) return;

    if (!form.name.trim()) {
      toast.error("Store name is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone is required");
      return;
    }

    const payload = toPayload(form);

    try {
      if (selectedStore) {
        await adminApi.updateStore(selectedStore.id, payload);
        toast.success("Store updated");
      } else {
        await adminApi.createStore(payload);
        toast.success("Store created");
      }
      resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selectedStore ? "Failed to update store" : "Failed to create store"));
    }
  }

  async function handleToggle(store: Store) {
    try {
      await adminApi.updateStore(store.id, {
        ...toPayload(toFormState(store)),
        active: !store.active
      });
      toast.success(store.active ? "Store hidden from website" : "Store activated");
      if (editorStoreId === store.id) {
        setForm((current) => ({ ...current, active: !store.active }));
      }
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to toggle store"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    try {
      await adminApi.deleteStore(pendingDelete.id);
      toast.success("Store deleted");
      if (editorStoreId === pendingDelete.id) resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete store"));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ecosystem Presence"
        title="Branch Registry"
        description="Manage the physical topology of your network. Branches serve as regional logistics nodes and storefront anchors."
        variant="premium"
        actions={
          <button 
            type="button" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
            onClick={openPostStore}
          >
            <Plus className="h-4 w-4" />
            Deploy Node
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Branches"
            value={String(stores.length)}
            meta="Global physical nodes"
            icon={<MapPin className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Operational"
            value={String(activeStores)}
            meta="Active market presence"
            icon={<Eye className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Node Rating"
            value={averageRating ? averageRating.toFixed(1) : "--"}
            meta={`${totalReviews} Verified signals`}
            icon={<Star className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Network Health"
            value="Optimal"
            meta="Latency: Sub-40ms"
            icon={<Zap className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-16 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
              placeholder="Identify node by nomenclature, city, or coordinate..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="relative w-full lg:w-64">
            <select
              className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 px-8 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5 appearance-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="ALL">Protocol: All</option>
              <option value="ACTIVE">Protocol: Active</option>
              <option value="HIDDEN">Protocol: Hidden</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mt-12">
        {!filteredStores.length ? (
          <EmptyState
            icon={<MapPin className="h-7 w-7" />}
            title="No stores match the current filters"
            description="Try adjusting the branch search or status filter. Use Post store to add a new branch."
          />
        ) : (
          <div className="grid gap-8">
            {filteredStores.map((store) => (
              <article key={store.id} className="admin-card-elevated group overflow-hidden border-none bg-white p-0 shadow-2xl transition-all hover:scale-[1.01] dark:bg-slate-900">
                <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                  <div className="relative min-h-[280px] bg-slate-100 dark:bg-white/5">
                    {store.imageUrl ? (
                      <img src={store.imageUrl} alt={store.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-white/5">
                        <img src={vrTechnologiesLogo} alt="VR" className="h-20 w-20 opacity-20 grayscale" />
                      </div>
                    )}
                    <div className="absolute left-6 top-6 flex flex-col gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md",
                        store.active ? "bg-emerald-500/80" : "bg-slate-500/80"
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        {store.active ? "Live Node" : "Restricted"}
                      </span>
                      {store.googleRating != null && (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-xl backdrop-blur-md">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {store.googleRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-10">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{store.name}</h3>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                          {store.address}
                          {store.landmark ? `, ${store.landmark}` : ""}
                          {store.postalCode ? ` - ${store.postalCode}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {store.mapLink && (
                          <a href={store.mapLink} target="_blank" rel="noreferrer" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-slate-900">
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        )}
                        <button onClick={() => openEditStore(store)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 transition-all hover:bg-sky-600 hover:text-white">
                          <PencilLine className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleToggle(store)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-slate-900">
                          {store.active ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setPendingDelete(store)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 transition-all hover:bg-rose-600 hover:text-white">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        {store.city}, {store.state}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-700" />
                        <a href={`tel:${store.phone}`} className="hover:underline">{store.phone}</a>
                      </span>
                      {store.whatsapp ? (
                        <span className="inline-flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-emerald-700" />
                          <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {store.whatsapp}
                          </a>
                        </span>
                      ) : null}
                      {store.timings ? (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 text-emerald-700" />
                          {store.timings}
                        </span>
                      ) : null}
                    </div>

                    {store.googleReviewCount != null && store.googleReviewCount > 0 ? (
                      <div className="mt-3 text-xs text-slate-500">{store.googleReviewCount} Google reviews</div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <StoreEditorDrawer
        form={form}
        onChange={setForm}
        onClose={resetForm}
        onImageUpload={handleImageUpload}
        onNew={openPostStore}
        onSubmit={handleSubmit}
        open={editorOpen}
        selectedStore={selectedStore}
        uploadingImage={uploadingImage}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete store?"}
        description="This removes the branch from Store Management. If products or orders are linked to this store, the backend will block deletion."
        confirmLabel="Delete store"
        tone="danger"
      />
    </div>
  );
}
