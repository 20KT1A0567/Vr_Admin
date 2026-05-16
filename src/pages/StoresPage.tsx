import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Eye, EyeOff, MapPin, MessageCircle, PencilLine, Phone, Search, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { StoreEditorDrawer, type StoreFormState } from "components/admin/StoreEditorDrawer";
import { StorePostBar } from "components/admin/StorePostBar";
import type { Store } from "types";
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
    <div className="space-y-5">
      <StorePostBar
        activeCount={activeStores}
        averageRating={averageRating ? averageRating.toFixed(1) : "--"}
        onPostStore={openPostStore}
        reviewCount={totalReviews}
        totalCount={stores.length}
      />

      <section className="space-y-4">
        <div className="admin-shell p-5">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="admin-input pl-11"
                placeholder="Search by name, city, address, or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="HIDDEN">Hidden</option>
            </select>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              {filteredStores.length} shown
            </div>
          </div>
        </div>

        {!filteredStores.length ? (
          <EmptyState
            icon={<MapPin className="h-7 w-7" />}
            title="No stores match the current filters"
            description="Try adjusting the branch search or status filter. Use Post store to add a new branch."
          />
        ) : (
          <div className="grid gap-4">
            {filteredStores.map((store) => (
              <article key={store.id} className="admin-card overflow-hidden p-0">
                <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
                  <div className="relative min-h-[220px] bg-slate-100">
                    {store.imageUrl ? (
                      <img src={store.imageUrl} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f5f1dc,#f7fafc)]">
                        <img src={vrTechnologiesLogo} alt="VR Technologies logo" className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className={store.active ? "admin-badge-green" : "admin-badge-slate"}>
                        {store.active ? "Active" : "Hidden"}
                      </span>
                      {store.googleRating != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <Star className="h-3 w-3 fill-current" />
                          {store.googleRating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-950">{store.name}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {store.address}
                          {store.landmark ? `, ${store.landmark}` : ""}
                          {store.postalCode ? ` - ${store.postalCode}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {store.mapLink ? (
                          <a href={store.mapLink} target="_blank" rel="noreferrer" className="admin-icon-button" aria-label="Open on Maps">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button type="button" className="admin-icon-button" onClick={() => openEditStore(store)} aria-label="Edit">
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => handleToggle(store)}
                          aria-label={store.active ? "Hide" : "Activate"}
                        >
                          {store.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button type="button" className="admin-icon-button-danger" onClick={() => setPendingDelete(store)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
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
