import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FormField } from "components/admin/FormField";
import { FormSection } from "components/admin/FormSection";
import { PageHeader } from "components/admin/PageHeader";
import { Tabs } from "components/admin/Tabs";
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

type SettingsTab = "BUSINESS" | "STOREFRONT" | "PAYMENTS" | "NOTIFICATIONS" | "SECURITY";

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("BUSINESS");
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
        companyName: form.companyName.trim(),
        supportEmail: form.supportEmail.trim() || undefined,
        supportPhone: form.supportPhone.trim() || undefined,
        shippingNote: form.shippingNote.trim() || undefined,
        returnPolicy: form.returnPolicy.trim() || undefined,
        defaultCity: form.defaultCity.trim() || undefined,
        defaultState: form.defaultState.trim() || undefined,
        mapLink: form.mapLink.trim() || undefined
      });
      toast.success("Settings updated");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update settings"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Group business profile, storefront defaults, support channels, and security context into one cleaner admin control center."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-shell-muted p-4">
            <div className="admin-section-label">Company</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{form.companyName || "Not configured"}</div>
          </div>
          <div className="admin-shell-muted p-4">
            <div className="admin-section-label">Connected Stores</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{stores.length}</div>
          </div>
          <div className="admin-shell-muted p-4">
            <div className="admin-section-label">Primary City</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{form.defaultCity || "Not set"}</div>
          </div>
          <div className="admin-shell-muted p-4">
            <div className="admin-section-label">Admin Owner</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{user?.name ?? "Admin"}</div>
          </div>
        </div>
      </PageHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="admin-shell px-5 py-4 sm:px-6">
          <Tabs
            items={[
              { value: "BUSINESS", label: "Business Profile" },
              { value: "STOREFRONT", label: "Storefront" },
              { value: "PAYMENTS", label: "Payments" },
              { value: "NOTIFICATIONS", label: "Notifications" },
              { value: "SECURITY", label: "Security" }
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "BUSINESS" ? (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <FormSection title="Business profile" description="These values feed the business identity shown across the admin and storefront.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company name" required>
                  <input className="admin-input" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
                </FormField>
                <FormField label="Support phone">
                  <input className="admin-input" value={form.supportPhone} onChange={(event) => setForm((current) => ({ ...current, supportPhone: event.target.value }))} />
                </FormField>
                <FormField label="Support email" hint="Used for customer-facing help and operational support.">
                  <input className="admin-input" value={form.supportEmail} onChange={(event) => setForm((current) => ({ ...current, supportEmail: event.target.value }))} />
                </FormField>
                <FormField label="Map link">
                  <input className="admin-input" value={form.mapLink} onChange={(event) => setForm((current) => ({ ...current, mapLink: event.target.value }))} />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Workspace context" description="Quick visibility into who manages the console and which stores are currently connected.">
              <div className="space-y-4">
                <div className="admin-shell-muted p-4">
                  <div className="admin-section-label">Current admin</div>
                  <div className="mt-2 text-base font-semibold text-slate-950">{user?.name ?? "Admin"}</div>
                  <div className="mt-1 text-sm text-slate-500">{user?.email ?? "No email"}</div>
                </div>
                <div className="admin-shell-muted p-4">
                  <div className="admin-section-label">Store network</div>
                  <div className="mt-2 text-base font-semibold text-slate-950">{stores.length} active store records</div>
                  <div className="mt-3 space-y-2">
                    {stores.slice(0, 4).map((store) => (
                      <div key={store.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        {store.name} · {store.city}, {store.state}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        ) : null}

        {activeTab === "STOREFRONT" ? (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <FormSection title="Storefront defaults" description="Operational defaults used for service coverage and customer-facing policy content.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Default city">
                  <input className="admin-input" value={form.defaultCity} onChange={(event) => setForm((current) => ({ ...current, defaultCity: event.target.value }))} />
                </FormField>
                <FormField label="Default state">
                  <input className="admin-input" value={form.defaultState} onChange={(event) => setForm((current) => ({ ...current, defaultState: event.target.value }))} />
                </FormField>
                <FormField label="Shipping note">
                  <textarea className="admin-textarea min-h-[120px]" value={form.shippingNote} onChange={(event) => setForm((current) => ({ ...current, shippingNote: event.target.value }))} />
                </FormField>
                <FormField label="Return policy">
                  <textarea className="admin-textarea min-h-[120px]" value={form.returnPolicy} onChange={(event) => setForm((current) => ({ ...current, returnPolicy: event.target.value }))} />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Storefront notes" description="The current API exposes a compact settings payload, so this panel focuses on the fields already persisted by the backend.">
              <div className="space-y-4">
                <div className="admin-shell-muted p-4 text-sm leading-6 text-slate-600">
                  Use these fields to keep business copy, support channels, and service-area defaults consistent across the storefront.
                </div>
                <div className="admin-shell-muted p-4 text-sm leading-6 text-slate-600">
                  If you want deeper controls for homepage SEO, payments, and notification routing, we can extend those in the next pass without changing existing endpoints.
                </div>
              </div>
            </FormSection>
          </div>
        ) : null}

        {activeTab === "PAYMENTS" ? (
          <FormSection title="Payments" description="No editable payment provider configuration is exposed by the current admin settings API.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Current state</div>
                <div className="mt-2 text-base font-semibold text-slate-950">Backend-managed</div>
                <p className="mt-2 text-sm text-slate-500">Provider and gateway settings are not part of the persisted site settings payload yet.</p>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Recommended next step</div>
                <div className="mt-2 text-base font-semibold text-slate-950">Add payment settings endpoint</div>
                <p className="mt-2 text-sm text-slate-500">Once available, this tab can hold gateway toggles, keys, and settlement preferences.</p>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Safety</div>
                <div className="mt-2 text-base font-semibold text-slate-950">No hidden changes</div>
                <p className="mt-2 text-sm text-slate-500">This redesign leaves existing payment behavior untouched.</p>
              </div>
            </div>
          </FormSection>
        ) : null}

        {activeTab === "NOTIFICATIONS" ? (
          <FormSection title="Notifications" description="Notification routing is not currently exposed through the existing backend settings API.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Support channel</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{form.supportEmail || "No support email configured"}</div>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Operational phone</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{form.supportPhone || "No support phone configured"}</div>
              </div>
            </div>
          </FormSection>
        ) : null}

        {activeTab === "SECURITY" ? (
          <FormSection title="Security context" description="Security settings remain controlled by the existing auth and super-admin flows.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Signed-in role</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{user?.roleName ?? user?.role ?? "Admin"}</div>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Session owner</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{user?.email ?? "No email"}</div>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Access model</div>
                <div className="mt-2 text-base font-semibold text-slate-950">Token + permission based</div>
              </div>
            </div>
          </FormSection>
        ) : null}

        <div className="sticky bottom-4 z-20">
          <div className="admin-shell flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div>
              <div className="text-sm font-semibold text-slate-950">Persisted settings</div>
              <div className="text-sm text-slate-500">Saving here only updates fields supported by the current backend settings payload.</div>
            </div>
            <button className="admin-button inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
