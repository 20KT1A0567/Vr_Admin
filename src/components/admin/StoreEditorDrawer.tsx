import type { ChangeEvent, FormEvent } from "react";
import { RotateCcw } from "lucide-react";
import { FileUploadCard } from "components/admin/FileUploadCard";
import { SlideOverDrawer } from "components/admin/SlideOverDrawer";
import type { Store } from "types";
import vrTechnologiesLogo from "../../assets/vr-technologies-logo.svg";

export type StoreFormState = {
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

interface StoreEditorDrawerProps {
  form: StoreFormState;
  onChange: (updater: (current: StoreFormState) => StoreFormState) => void;
  onClose: () => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onNew: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  selectedStore: Store | null;
  uploadingImage: boolean;
}

export function StoreEditorDrawer({
  form,
  onChange,
  onClose,
  onImageUpload,
  onNew,
  onSubmit,
  open,
  selectedStore,
  uploadingImage
}: StoreEditorDrawerProps) {
  const isEdit = Boolean(selectedStore);

  return (
    <SlideOverDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit store" : "Post store"}
      subtitle={isEdit ? "Update branch identity, contact details, map link, rating, and website visibility." : "Create a new branch for the storefront store directory."}
      width="lg"
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="admin-pill">{isEdit ? "Edit branch" : "Post branch"}</div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-950">{isEdit ? "Update branch" : "Create branch"}</h2>
          </div>
          {isEdit ? (
            <button type="button" className="admin-icon-button" onClick={onNew} aria-label="New store">
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="admin-shell-muted grid gap-3 p-4 sm:grid-cols-2">
          <input className="admin-input sm:col-span-2" placeholder="Store name" value={form.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
          <input className="admin-input sm:col-span-2" placeholder="Address" value={form.address} onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))} />
          <input className="admin-input" placeholder="Landmark" value={form.landmark} onChange={(event) => onChange((current) => ({ ...current, landmark: event.target.value }))} />
          <input className="admin-input" placeholder="Postal code" value={form.postalCode} onChange={(event) => onChange((current) => ({ ...current, postalCode: event.target.value }))} />
          <input className="admin-input" placeholder="City" value={form.city} onChange={(event) => onChange((current) => ({ ...current, city: event.target.value }))} />
          <input className="admin-input" placeholder="State" value={form.state} onChange={(event) => onChange((current) => ({ ...current, state: event.target.value }))} />
          <input className="admin-input" placeholder="Phone" value={form.phone} onChange={(event) => onChange((current) => ({ ...current, phone: event.target.value }))} />
          <input className="admin-input" placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => onChange((current) => ({ ...current, whatsapp: event.target.value }))} />
          <input className="admin-input sm:col-span-2" placeholder="Timings (e.g. 10am - 9pm)" value={form.timings} onChange={(event) => onChange((current) => ({ ...current, timings: event.target.value }))} />
          <input className="admin-input sm:col-span-2" placeholder="Google Maps link" value={form.mapLink} onChange={(event) => onChange((current) => ({ ...current, mapLink: event.target.value }))} />
          <input className="admin-input" inputMode="decimal" placeholder="Google rating" value={form.googleRating} onChange={(event) => onChange((current) => ({ ...current, googleRating: event.target.value }))} />
          <input className="admin-input" inputMode="numeric" placeholder="Review count" value={form.googleReviewCount} onChange={(event) => onChange((current) => ({ ...current, googleReviewCount: event.target.value }))} />
        </div>

        <label className="admin-check-card cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(event) => onChange((current) => ({ ...current, active: event.target.checked }))} />
          Show this store on the website
        </label>

        <FileUploadCard
          title="Store image"
          description="Branch photo for storefront cards, store listings, and local trust surfaces."
          uploading={uploadingImage}
          valueLabel={form.imageUrl ? "Image ready" : undefined}
          onChange={onImageUpload}
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

        <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
          <button type="button" className="admin-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="admin-button" disabled={uploadingImage}>
            {isEdit ? "Update store" : "Post store"}
          </button>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
