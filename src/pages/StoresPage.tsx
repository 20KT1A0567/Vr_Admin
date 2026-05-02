import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Eye, EyeOff, MapPin, MessageCircle, PencilLine, Phone, RotateCcw, Search, Star } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { FileUploadCard } from "components/admin/FileUploadCard";
import type { Store } from "types";
import vrTechnologiesLogo from "../assets/vr-technologies-logo.svg";

type StoreFormState = {
  name: string;
  address: string;
  landmark: string;
  postalCode: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  timings: string;
  mapLink: string;
  imageUrl: string;
  googleRating: string;
  googleReviewCount: string;
  active: boolean;
};

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
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "HIDDEN">("ALL");

  const selectedStore = useMemo(() => stores.find((store) => store.id === selectedStoreId) ?? null, [stores, selectedStoreId]);
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
    setSelectedStoreId(null);
    setForm(initialFormState);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

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
    if (uploadingImage) {
      return;
    }

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
      if (selectedStoreId === store.id) {
        setForm((current) => ({ ...current, active: !store.active }));
      }
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to toggle store"));
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Stores</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">Branch directory</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage branch identity, Google trust signals, and storefront-ready store cards. The website store pages and homepage cards read from this data.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Total stores</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{stores.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Active</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{activeStores}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Avg rating</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{averageRating ? averageRating.toFixed(1) : "--"}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Reviews</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{totalReviews}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form className="admin-shell space-y-4 p-6 lg:sticky lg:top-24 lg:self-start" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="admin-pill">{selectedStore ? "Edit store" : "Add store"}</div>
              <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">
                {selectedStore ? "Update branch" : "Create branch"}
              </h2>
            </div>
            {selectedStore ? (
              <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="New">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="admin-shell-muted grid gap-3 p-4 sm:grid-cols-2">
            <input
              className="admin-input sm:col-span-2"
              placeholder="Store name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="admin-input sm:col-span-2"
              placeholder="Address"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
            <input className="admin-input" placeholder="Landmark" value={form.landmark} onChange={(event) => setForm((current) => ({ ...current, landmark: event.target.value }))} />
            <input className="admin-input" placeholder="Postal code" value={form.postalCode} onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))} />
            <input className="admin-input" placeholder="City" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
            <input className="admin-input" placeholder="State" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} />
            <input className="admin-input" placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="admin-input" placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} />
            <input className="admin-input sm:col-span-2" placeholder="Timings (e.g. 10am - 9pm)" value={form.timings} onChange={(event) => setForm((current) => ({ ...current, timings: event.target.value }))} />
            <input className="admin-input sm:col-span-2" placeholder="Google Maps link" value={form.mapLink} onChange={(event) => setForm((current) => ({ ...current, mapLink: event.target.value }))} />
            <input className="admin-input" inputMode="decimal" placeholder="Google rating" value={form.googleRating} onChange={(event) => setForm((current) => ({ ...current, googleRating: event.target.value }))} />
            <input className="admin-input" inputMode="numeric" placeholder="Review count" value={form.googleReviewCount} onChange={(event) => setForm((current) => ({ ...current, googleReviewCount: event.target.value }))} />
          </div>

          <label className="admin-check-card cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Show this store on the website
          </label>

          <FileUploadCard
            title="Store image"
            description="Branch photo for storefront cards, store listings, and local trust surfaces."
            uploading={uploadingImage}
            valueLabel={form.imageUrl ? "Image ready" : undefined}
            onChange={handleImageUpload}
            preview={
              form.imageUrl ? (
                <div className="aspect-[16/9]">
                  <img src={form.imageUrl} alt="Store preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="admin-upload-placeholder">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <img src={vrTechnologiesLogo} alt="VR Technologies logo" className="h-14 w-14 rounded-xl border border-slate-200 bg-[#f5f1dc] p-1" />
                    Select a store image to preview it here.
                  </div>
                </div>
              )
            }
          />

          <button className="admin-button w-full" disabled={uploadingImage}>
            {selectedStore ? "Update store" : "Create store"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="admin-shell p-5">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="admin-input pl-11"
                  placeholder="Search by name, city, or address"
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
              description="Try adjusting the branch search or status filter. Branches created here flow into the storefront store directory and homepage highlights."
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
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => {
                              setSelectedStoreId(store.id);
                              setForm(toFormState(store));
                            }}
                            aria-label="Edit"
                          >
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
      </div>
    </div>
  );
}
