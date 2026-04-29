import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, PencilLine, RotateCcw, Store as StoreIcon } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import type { Store } from "types";

type StoreFormState = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  timings: string;
  mapLink: string;
  imageUrl: string;
  active: boolean;
};

const initialFormState: StoreFormState = {
  name: "",
  address: "",
  city: "",
  state: "Andhra Pradesh",
  phone: "",
  whatsapp: "",
  timings: "",
  mapLink: "",
  imageUrl: "",
  active: true
};

function toFormState(store: Store): StoreFormState {
  return {
    name: store.name,
    address: store.address,
    city: store.city,
    state: store.state,
    phone: store.phone,
    whatsapp: store.whatsapp ?? "",
    timings: store.timings ?? "",
    mapLink: store.mapLink ?? "",
    imageUrl: store.imageUrl ?? "",
    active: store.active
  };
}

export function StoresPage() {
  const { data: stores = [], refetch } = useQuery({ queryKey: ["admin-stores"], queryFn: adminApi.getStores });
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  );

  const activeStores = stores.filter((store) => store.active).length;

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

    if (selectedStore) {
      await adminApi.updateStore(selectedStore.id, form);
      toast.success("Store updated");
    } else {
      await adminApi.createStore(form);
      toast.success("Store created");
    }

    resetForm();
    await refetch();
  }

  async function handleToggle(store: Store) {
    await adminApi.updateStore(store.id, { ...toFormState(store), active: !store.active });
    toast.success(store.active ? "Store hidden from website" : "Store activated");
    if (selectedStoreId === store.id) {
      setForm((current) => ({ ...current, active: !store.active }));
    }
    await refetch();
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Stores</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">Manage store branches, storefront cards, and pickup-ready branch details in one place.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              This screen now follows the reference board with a clean editor on the left and a readable store network list on the right.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total stores</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{stores.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active stores</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{activeStores}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <form className="admin-shell space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="admin-pill">{selectedStore ? "Edit Store" : "Add Store"}</div>
              <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">
                {selectedStore ? "Update branch details" : "Create a store profile"}
              </h2>
            </div>
            {selectedStore ? (
              <button type="button" className="admin-button-secondary" onClick={resetForm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New
              </button>
            ) : null}
          </div>

          {[
            ["name", "Store name"],
            ["address", "Address"],
            ["city", "City"],
            ["state", "State"],
            ["phone", "Phone"],
            ["whatsapp", "WhatsApp"],
            ["timings", "Timings"],
            ["mapLink", "Map link"]
          ].map(([key, label]) => (
            <input
              key={key}
              className="admin-input"
              placeholder={label}
              value={form[key as keyof StoreFormState] as string}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            />
          ))}

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Show this store on the website
          </label>

          <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Store image</div>
                <p className="mt-2 text-sm text-slate-500">Upload a branch photo used on the storefront and dashboard.</p>
              </div>
              <label className={`admin-button-secondary cursor-pointer ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}>
                <ImagePlus className="mr-2 h-4 w-4" />
                {uploadingImage ? "Uploading..." : form.imageUrl ? "Change image" : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
            <div className="mt-4 aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-white">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Store preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                  Select a store image to preview it here.
                </div>
              )}
            </div>
          </div>

          <button className="admin-button w-full" disabled={uploadingImage}>
            {selectedStore ? "Update store" : "Create store"}
          </button>
        </form>

        <section className="space-y-4">
          {stores.map((store) => (
            <article key={store.id} className="admin-shell overflow-hidden">
              <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="min-h-[180px] bg-slate-100">
                  {store.imageUrl ? (
                    <img src={store.imageUrl} alt={store.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <StoreIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-950">{store.name}</h3>
                        <span className={store.active ? "admin-badge-green" : "admin-badge-slate"}>{store.active ? "Active" : "Hidden"}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {store.address}, {store.city}, {store.state}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>{store.phone}</span>
                        {store.whatsapp ? <span>WhatsApp: {store.whatsapp}</span> : null}
                        {store.timings ? <span>{store.timings}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="admin-button-secondary"
                        onClick={() => {
                          setSelectedStoreId(store.id);
                          setForm(toFormState(store));
                        }}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </button>
                      <button type="button" className="admin-button-secondary" onClick={() => handleToggle(store)}>
                        {store.active ? "Hide" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
