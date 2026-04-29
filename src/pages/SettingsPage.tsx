import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import { useAuthStore } from "store/authStore";

type SettingsForm = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  shippingNote: string;
  returnPolicy: string;
  defaultCity: string;
  defaultState: string;
  mapLink: string;
};

const emptyForm: SettingsForm = {
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  shippingNote: "",
  returnPolicy: "",
  defaultCity: "",
  defaultState: "",
  mapLink: ""
};

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { data: settings, refetch } = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.getSettings });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores"], queryFn: adminApi.getStores });
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm({
      companyName: settings.companyName ?? "",
      supportEmail: settings.supportEmail ?? "",
      supportPhone: settings.supportPhone ?? "",
      shippingNote: settings.shippingNote ?? "",
      returnPolicy: settings.returnPolicy ?? "",
      defaultCity: settings.defaultCity ?? "",
      defaultState: settings.defaultState ?? "",
      mapLink: settings.mapLink ?? ""
    });
  }, [settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSettings({
        companyName: form.companyName,
        supportEmail: form.supportEmail || undefined,
        supportPhone: form.supportPhone || undefined,
        shippingNote: form.shippingNote || undefined,
        returnPolicy: form.returnPolicy || undefined,
        defaultCity: form.defaultCity || undefined,
        defaultState: form.defaultState || undefined,
        mapLink: form.mapLink || undefined
      });
      toast.success("Settings updated");
      await refetch();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Failed to update settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Settings</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">General business settings for store, shipping, and support operations.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              These values are now persisted through the backend instead of staying local to the page.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            API base: {import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api"}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <form className="admin-shell space-y-6 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">General settings</div>
                <h2 className="admin-display mt-2 text-2xl font-semibold text-slate-950">Business profile</h2>
              </div>
              <input className="admin-input" placeholder="Company name" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
              <input className="admin-input" placeholder="Support email" value={form.supportEmail} onChange={(event) => setForm((current) => ({ ...current, supportEmail: event.target.value }))} />
              <input className="admin-input" placeholder="Support phone" value={form.supportPhone} onChange={(event) => setForm((current) => ({ ...current, supportPhone: event.target.value }))} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Shipping settings</div>
                <h2 className="admin-display mt-2 text-2xl font-semibold text-slate-950">Fulfilment defaults</h2>
              </div>
              <textarea className="admin-textarea" rows={3} placeholder="Shipping note" value={form.shippingNote} onChange={(event) => setForm((current) => ({ ...current, shippingNote: event.target.value }))} />
              <textarea className="admin-textarea" rows={3} placeholder="Return policy" value={form.returnPolicy} onChange={(event) => setForm((current) => ({ ...current, returnPolicy: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <input className="admin-input" placeholder="Default city" value={form.defaultCity} onChange={(event) => setForm((current) => ({ ...current, defaultCity: event.target.value }))} />
            <input className="admin-input" placeholder="Default state" value={form.defaultState} onChange={(event) => setForm((current) => ({ ...current, defaultState: event.target.value }))} />
            <input className="admin-input" placeholder="Primary map link" value={form.mapLink} onChange={(event) => setForm((current) => ({ ...current, mapLink: event.target.value }))} />
          </div>

          <button className="admin-button" disabled={saving}>Save changes</button>
        </form>

        <aside className="space-y-4">
          <section className="admin-shell p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin account</div>
            <div className="admin-display mt-2 text-2xl font-semibold text-slate-950">{user?.name ?? "Admin"}</div>
            <p className="mt-1 text-sm text-slate-500">{user?.email ?? "No email attached"}</p>
            <div className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {user?.role ?? "ADMIN"}
            </div>
          </section>

          <section className="admin-shell p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Connected stores</div>
            <div className="admin-display mt-2 text-2xl font-semibold text-slate-950">{stores.length}</div>
            <div className="mt-4 space-y-3">
              {stores.slice(0, 4).map((store) => (
                <div key={store.id} className="admin-shell-muted p-4">
                  <div className="font-medium text-slate-900">{store.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{store.city}, {store.state}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
