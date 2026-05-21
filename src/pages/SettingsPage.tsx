import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, CreditCard, Database, LockKeyhole, MapPin, ServerCog, Settings2, ShieldCheck, Store, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FormField } from "components/admin/FormField";
import { FormSection } from "components/admin/FormSection";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { useAuthStore } from "store/authStore";
import { cn } from "utils/cn";

type SettingsForm = {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  shippingNote: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  standardDeliveryCharge: string;
  freeDeliveryThreshold: string;
  stateDeliveryCharges: string;
  stateDeliveryWindows: string;
  estimatedDeliveryDays: string;
  gstEnabled: boolean;
  gstRate: string;
  gstNumber: string;
  companyPan: string;
  defaultHsnCode: string;
  companyAddress: string;
  companyPincode: string;
  invoicePrefix: string;
  invoicePadding: string;
  invoiceNextSequence: string;
  invoiceTerms: string;
  returnPolicy: string;
  defaultCity: string;
  defaultState: string;
  mapLink: string;
  includeDefaultHomeSections: boolean;
  defaultHomeSectionTypes: string;
};

type SettingsTab = "BUSINESS" | "STOREFRONT" | "PAYMENTS" | "NOTIFICATIONS" | "SECURITY";

const emptyForm: SettingsForm = {
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  shippingNote: "",
  pickupEnabled: true,
  deliveryEnabled: true,
  standardDeliveryCharge: "0",
  freeDeliveryThreshold: "",
  stateDeliveryCharges: "",
  stateDeliveryWindows: "",
  estimatedDeliveryDays: "5",
  gstEnabled: true,
  gstRate: "18",
  gstNumber: "",
  companyPan: "",
  defaultHsnCode: "",
  companyAddress: "",
  companyPincode: "",
  invoicePrefix: "INV-",
  invoicePadding: "6",
  invoiceNextSequence: "1",
  invoiceTerms: "",
  returnPolicy: "",
  defaultCity: "",
  defaultState: "",
  mapLink: "",
  includeDefaultHomeSections: true,
  defaultHomeSectionTypes: "TODAYS_DEALS,FEATURED_PRODUCTS,BEST_SELLERS,NEW_ARRIVALS,LOW_PRICE_DEALS"
};

const allDefaultHomeSectionTypes = "TODAYS_DEALS,FEATURED_PRODUCTS,BEST_SELLERS,NEW_ARRIVALS,LOW_PRICE_DEALS";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Tamil Nadu",
  "Kerala",
  "Maharashtra",
  "Goa",
  "Delhi",
  "Gujarat",
  "Rajasthan",
  "Madhya Pradesh",
  "Uttar Pradesh",
  "West Bengal",
  "Odisha"
];

function parseStateRules(rules: string) {
  return rules.split(/\r?\n|;/).reduce<Record<string, string>>((acc, entry) => {
    const [state, value] = entry.split("=");
    if (state?.trim() && value != null) {
      acc[state.trim()] = value.trim();
    }
    return acc;
  }, {});
}

function serializeStateRules(values: Record<string, string>) {
  return Object.entries(values)
    .filter(([, value]) => value.trim())
    .map(([state, value]) => `${state}=${value.trim()}`)
    .join("\n");
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { data: settings, refetch } = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.getSettings });
  const { data: stores = [] } = useQuery({ queryKey: ["admin-stores"], queryFn: adminApi.getStores });
  const { data: razorpaySettings } = useQuery({ queryKey: ["admin-razorpay-settings"], queryFn: adminApi.getRazorpaySettings });
  const { data: systemHealth } = useQuery({ queryKey: ["admin-system-health"], queryFn: adminApi.getSystemHealth });
  const [activeTab, setActiveTab] = useState<SettingsTab>("BUSINESS");
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedCoverageState, setSelectedCoverageState] = useState("Telangana");

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm({
      companyName: settings.companyName ?? "",
      supportEmail: settings.supportEmail ?? "",
      supportPhone: settings.supportPhone ?? "",
      shippingNote: settings.shippingNote ?? "",
      pickupEnabled: settings.pickupEnabled ?? true,
      deliveryEnabled: settings.deliveryEnabled ?? true,
      standardDeliveryCharge: String(settings.standardDeliveryCharge ?? 0),
      freeDeliveryThreshold: settings.freeDeliveryThreshold == null ? "" : String(settings.freeDeliveryThreshold),
      stateDeliveryCharges: settings.stateDeliveryCharges ?? "",
      stateDeliveryWindows: settings.stateDeliveryWindows ?? "",
      estimatedDeliveryDays: String(settings.estimatedDeliveryDays ?? 5),
      gstEnabled: settings.gstEnabled ?? true,
      gstRate: String(settings.gstRate ?? 18),
      gstNumber: settings.gstNumber ?? "",
      companyPan: settings.companyPan ?? "",
      defaultHsnCode: settings.defaultHsnCode ?? "",
      companyAddress: settings.companyAddress ?? "",
      companyPincode: settings.companyPincode ?? "",
      invoicePrefix: settings.invoicePrefix ?? "INV-",
      invoicePadding: String(settings.invoicePadding ?? 6),
      invoiceNextSequence: String(settings.invoiceNextSequence ?? 1),
      invoiceTerms: settings.invoiceTerms ?? "",
      returnPolicy: settings.returnPolicy ?? "",
      defaultCity: settings.defaultCity ?? "",
      defaultState: settings.defaultState ?? "",
      mapLink: settings.mapLink ?? "",
      includeDefaultHomeSections: settings.includeDefaultHomeSections ?? true,
      defaultHomeSectionTypes: settings.defaultHomeSectionTypes ?? allDefaultHomeSectionTypes
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
        pickupEnabled: form.pickupEnabled,
        deliveryEnabled: form.deliveryEnabled,
        standardDeliveryCharge: Number(form.standardDeliveryCharge || 0),
        freeDeliveryThreshold: form.freeDeliveryThreshold.trim() ? Number(form.freeDeliveryThreshold) : undefined,
        stateDeliveryCharges: form.stateDeliveryCharges.trim() || undefined,
        stateDeliveryWindows: form.stateDeliveryWindows.trim() || undefined,
        estimatedDeliveryDays: Number(form.estimatedDeliveryDays || 5),
        gstEnabled: form.gstEnabled,
        gstRate: Number(form.gstRate || 0),
        gstNumber: form.gstNumber.trim() || undefined,
        companyPan: form.companyPan.trim() || undefined,
        defaultHsnCode: form.defaultHsnCode.trim() || undefined,
        companyAddress: form.companyAddress.trim() || undefined,
        companyPincode: form.companyPincode.trim() || undefined,
        invoicePrefix: form.invoicePrefix.trim() || undefined,
        invoicePadding: form.invoicePadding.trim() ? Number(form.invoicePadding) : undefined,
        invoiceNextSequence: form.invoiceNextSequence.trim() ? Number(form.invoiceNextSequence) : undefined,
        invoiceTerms: form.invoiceTerms.trim() || undefined,
        returnPolicy: form.returnPolicy.trim() || undefined,
        defaultCity: form.defaultCity.trim() || undefined,
        defaultState: form.defaultState.trim() || undefined,
        mapLink: form.mapLink.trim() || undefined,
        includeDefaultHomeSections: form.includeDefaultHomeSections,
        defaultHomeSectionTypes: form.defaultHomeSectionTypes
      });
      toast.success("Settings updated");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update settings"));
    } finally {
      setSaving(false);
    }
  }

  const stateCharges = parseStateRules(form.stateDeliveryCharges);
  const stateWindows = parseStateRules(form.stateDeliveryWindows);
  const selectedStateCharge = stateCharges[selectedCoverageState] ?? "";
  const selectedStateWindow = stateWindows[selectedCoverageState] ?? "";

  function updateStateCoverage(state: string, field: "charge" | "window", value: string) {
    if (field === "charge") {
      setForm((current) => {
        const next = parseStateRules(current.stateDeliveryCharges);
        next[state] = value;
        return { ...current, stateDeliveryCharges: serializeStateRules(next) };
      });
      return;
    }
    setForm((current) => {
      const next = parseStateRules(current.stateDeliveryWindows);
      next[state] = value;
      return { ...current, stateDeliveryWindows: serializeStateRules(next) };
    });
  }

  const settingsNav: Array<{ value: SettingsTab; label: string; description: string; icon: ReactNode }> = [
    { value: "BUSINESS", label: "Business Profile", description: "Company, support and store context", icon: <Settings2 className="h-4 w-4" /> },
    { value: "STOREFRONT", label: "Storefront", description: "Delivery coverage, GST and policy", icon: <Store className="h-4 w-4" /> },
    { value: "PAYMENTS", label: "Payments", description: "Razorpay and checkout status", icon: <CreditCard className="h-4 w-4" /> },
    { value: "NOTIFICATIONS", label: "Notifications", description: "Support routing and contact channels", icon: <Bell className="h-4 w-4" /> },
    { value: "SECURITY", label: "Security", description: "Session and system health context", icon: <LockKeyhole className="h-4 w-4" /> }
  ];
  const activeNavItem = settingsNav.find((item) => item.value === activeTab) ?? settingsNav[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System Configuration"
        title="Protocol Settings"
        description="Configure the core operational parameters of your ecosystem. Business identity, storefront logistics, and security protocols."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Business Identity"
            value={form.companyName || "Unassigned"}
            meta="Core organization node"
            icon={<Building2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Node Network"
            value={String(stores.length)}
            meta="Connected physical branches"
            icon={<Store className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Regional Anchor"
            value={form.defaultCity || "Not set"}
            meta="Primary market locus"
            icon={<MapPin className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Ecosystem Health"
            value={systemHealth?.status ?? "Checking"}
            meta="Core services latency"
            icon={<ServerCog className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                Orchestration Console
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Business Protocol Workspace</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Manage the technical foundation of your administrative domain.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {settings?.updatedAt ? `Last update: ${new Date(settings.updatedAt).toLocaleDateString("en-IN")}` : "Live Telemetry"}
              </span>
            </div>
          </div>

          <div className="grid gap-0 bg-white dark:bg-slate-900 lg:grid-cols-[320px_minmax(0,1fr)]">
            <nav className="border-r border-slate-100 p-6 space-y-2 dark:border-white/5" aria-label="Settings sections">
              {settingsNav.map((item) => {
                const selected = item.value === activeTab;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={cn(
                      "group flex w-full items-center gap-4 rounded-[1.5rem] p-4 text-left transition-all duration-300",
                      selected
                        ? "bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                    )}
                    onClick={() => setActiveTab(item.value)}
                  >
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors",
                      selected 
                        ? (activeTab === "BUSINESS" ? "bg-white/20" : "bg-slate-800") 
                        : "bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200"
                    )}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-widest">{item.label}</div>
                      <div className={cn("mt-1 truncate text-[10px] font-bold", selected ? "opacity-60" : "text-slate-400")}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
            <div className="p-10 bg-slate-50/30 dark:bg-white/[0.01]">
              <div className="flex items-start gap-6 max-w-4xl">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-sky-500/10 text-sky-600 shadow-inner">
                  {activeNavItem.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{activeNavItem.label}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">{activeNavItem.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "BUSINESS" ? (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <FormSection className="!rounded-[24px]" title="Business profile" description="These values feed the business identity shown across the admin and storefront.">
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

            <FormSection className="!rounded-[24px]" title="Workspace context" description="Quick visibility into who manages the console and which stores are currently connected.">
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
            <FormSection className="!rounded-[24px]" title="Storefront defaults" description="Operational defaults used for service coverage and customer-facing policy content.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Default city">
                  <input className="admin-input" value={form.defaultCity} onChange={(event) => setForm((current) => ({ ...current, defaultCity: event.target.value }))} />
                </FormField>
                <FormField label="Default state">
                  <select className="admin-select" value={form.defaultState} onChange={(event) => setForm((current) => ({ ...current, defaultState: event.target.value }))}>
                    <option value="">Select default state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Shipping note">
                  <textarea className="admin-textarea min-h-[120px]" value={form.shippingNote} onChange={(event) => setForm((current) => ({ ...current, shippingNote: event.target.value }))} />
                </FormField>
                <FormField label="Return policy">
                  <textarea className="admin-textarea min-h-[120px]" value={form.returnPolicy} onChange={(event) => setForm((current) => ({ ...current, returnPolicy: event.target.value }))} />
                </FormField>
              </div>
            </FormSection>

            <FormSection className="!rounded-[24px]" title="Checkout charges" description="These values are used by website cart, checkout, and backend order totals.">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="admin-shell-muted flex items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-700">
                    Store pickup
                    <input type="checkbox" checked={form.pickupEnabled} onChange={(event) => setForm((current) => ({ ...current, pickupEnabled: event.target.checked }))} />
                  </label>
                  <label className="admin-shell-muted flex items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-700">
                    Delivery
                    <input type="checkbox" checked={form.deliveryEnabled} onChange={(event) => setForm((current) => ({ ...current, deliveryEnabled: event.target.checked }))} />
                  </label>
                </div>
                <FormField label="Delivery charge">
                  <input className="admin-input" type="number" min="0" value={form.standardDeliveryCharge} onChange={(event) => setForm((current) => ({ ...current, standardDeliveryCharge: event.target.value }))} />
                </FormField>
                <FormField label="Free delivery above">
                  <input className="admin-input" type="number" min="0" placeholder="Optional" value={form.freeDeliveryThreshold} onChange={(event) => setForm((current) => ({ ...current, freeDeliveryThreshold: event.target.value }))} />
                </FormField>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="admin-section-label">State delivery coverage</div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Select a state, then set the customer-facing delivery charge and ETA shown on checkout.</p>
                  <div className="mt-4 grid gap-3">
                    <FormField label="State">
                      <select className="admin-select" value={selectedCoverageState} onChange={(event) => setSelectedCoverageState(event.target.value)}>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </FormField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Charge">
                        <input
                          className="admin-input"
                          type="number"
                          min="0"
                          placeholder={form.standardDeliveryCharge}
                          value={selectedStateCharge}
                          onChange={(event) => updateStateCoverage(selectedCoverageState, "charge", event.target.value)}
                        />
                      </FormField>
                      <FormField label="Delivery days" hint="Example: 2-3 or 5">
                        <input
                          className="admin-input"
                          placeholder={form.estimatedDeliveryDays}
                          value={selectedStateWindow}
                          onChange={(event) => updateStateCoverage(selectedCoverageState, "window", event.target.value)}
                        />
                      </FormField>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                      {selectedCoverageState}: charge {selectedStateCharge || form.standardDeliveryCharge || "0"}, ETA {selectedStateWindow || `${form.estimatedDeliveryDays} days`}
                    </div>
                  </div>
                </div>
                <FormField label="State-wise delivery charges" hint="Advanced text format: Telangana=0">
                  <textarea className="admin-textarea min-h-[90px]" value={form.stateDeliveryCharges} onChange={(event) => setForm((current) => ({ ...current, stateDeliveryCharges: event.target.value }))} />
                </FormField>
                <FormField label="State-wise delivery days" hint="Advanced text format: Telangana=2-3">
                  <textarea className="admin-textarea min-h-[90px]" value={form.stateDeliveryWindows} onChange={(event) => setForm((current) => ({ ...current, stateDeliveryWindows: event.target.value }))} />
                </FormField>
                <FormField label="Estimated delivery days">
                  <input className="admin-input" type="number" min="1" value={form.estimatedDeliveryDays} onChange={(event) => setForm((current) => ({ ...current, estimatedDeliveryDays: event.target.value }))} />
                </FormField>
                <label className="admin-shell-muted flex items-center justify-between gap-3 p-4 text-sm font-semibold text-slate-700">
                  GST enabled
                  <input type="checkbox" checked={form.gstEnabled} onChange={(event) => setForm((current) => ({ ...current, gstEnabled: event.target.checked }))} />
                </label>
                <FormField label="GST rate (%)">
                  <input className="admin-input" type="number" min="0" step="0.01" value={form.gstRate} onChange={(event) => setForm((current) => ({ ...current, gstRate: event.target.value }))} />
                </FormField>
                <FormField label="GST number (GSTIN)">
                  <input className="admin-input font-mono" value={form.gstNumber} onChange={(event) => setForm((current) => ({ ...current, gstNumber: event.target.value }))} placeholder="22AAAAA0000A1Z5" />
                </FormField>
                <FormField label="Company PAN">
                  <input className="admin-input font-mono" value={form.companyPan} onChange={(event) => setForm((current) => ({ ...current, companyPan: event.target.value }))} placeholder="ABCDE1234F" />
                </FormField>
                <FormField label="Default HSN / SAC code" hint="Used on invoice line items when a product has none.">
                  <input className="admin-input font-mono" value={form.defaultHsnCode} onChange={(event) => setForm((current) => ({ ...current, defaultHsnCode: event.target.value }))} placeholder="84713000" />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              className="!rounded-[24px]"
              title="Invoice & company on tax invoice"
              description="These details appear on every customer invoice (PDF and email)."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company address" hint="Registered or billing address shown on the invoice header.">
                  <textarea className="admin-textarea min-h-[80px]" value={form.companyAddress} onChange={(event) => setForm((current) => ({ ...current, companyAddress: event.target.value }))} />
                </FormField>
                <FormField label="Company pincode">
                  <input className="admin-input" value={form.companyPincode} onChange={(event) => setForm((current) => ({ ...current, companyPincode: event.target.value }))} placeholder="500032" />
                </FormField>
                <FormField
                  label="Invoice prefix"
                  hint='E.g. "VRT-INV-2526/" — appended with a zero-padded sequence number.'
                >
                  <input className="admin-input font-mono" value={form.invoicePrefix} onChange={(event) => setForm((current) => ({ ...current, invoicePrefix: event.target.value }))} />
                </FormField>
                <FormField label="Sequence padding (digits)" hint="6 means 000001, 4 means 0001.">
                  <input className="admin-input" type="number" min="1" max="12" value={form.invoicePadding} onChange={(event) => setForm((current) => ({ ...current, invoicePadding: event.target.value }))} />
                </FormField>
                <FormField
                  label="Next invoice number"
                  hint="Edit only to reset (e.g. start of a new financial year). Existing invoice numbers are not reissued."
                >
                  <input className="admin-input" type="number" min="1" value={form.invoiceNextSequence} onChange={(event) => setForm((current) => ({ ...current, invoiceNextSequence: event.target.value }))} />
                </FormField>
                <div className="admin-shell-muted p-4 text-sm md:col-span-1">
                  <div className="admin-section-label">Preview</div>
                  <div className="mt-2 font-mono text-base font-bold text-slate-900">
                    {(form.invoicePrefix || "INV-") + String(Number(form.invoiceNextSequence || 1)).padStart(Math.max(1, Math.min(12, Number(form.invoicePadding || 6))), "0")}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Next invoice number that will be issued.</div>
                </div>
                <div className="md:col-span-2">
                  <FormField
                    label="Invoice footer / terms"
                    hint="Shown at the bottom of every invoice. Leave blank for the default thank-you note."
                  >
                    <textarea className="admin-textarea min-h-[100px]" value={form.invoiceTerms} onChange={(event) => setForm((current) => ({ ...current, invoiceTerms: event.target.value }))} placeholder="E. & O. E. · Subject to Hyderabad jurisdiction · Goods once sold..." />
                  </FormField>
                </div>
              </div>
            </FormSection>
          </div>
        ) : null}

        {activeTab === "PAYMENTS" ? (
          <FormSection className="!rounded-[24px]" title="Payments" description="Razorpay test-mode checkout is configured from backend environment properties.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Current state</div>
                <div className={`mt-2 text-base font-semibold ${razorpaySettings?.configured ? "text-emerald-700" : "text-amber-700"}`}>
                  {razorpaySettings?.configured ? "Razorpay connected" : "Razorpay incomplete"}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {razorpaySettings?.enabled ? "Online checkout is enabled for website UPI, card, and net banking orders." : "Online checkout is disabled in backend config."}
                </p>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Gateway</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{razorpaySettings?.merchantName ?? "VR Technologies"}</div>
                <p className="mt-2 break-all text-sm text-slate-500">Key ID: {razorpaySettings?.keyId ?? "Not configured"}</p>
              </div>
              <div className="admin-shell-muted p-4">
                <div className="admin-section-label">Security</div>
                <div className="mt-2 text-base font-semibold text-slate-950">{razorpaySettings?.currency ?? "INR"}</div>
                <p className="mt-2 text-sm text-slate-500">
                  Secret key {razorpaySettings?.keySecretConfigured ? "configured" : "missing"}.
                  Webhook secret {razorpaySettings?.webhookSecretConfigured ? "configured" : "not configured"}.
                </p>
              </div>
            </div>
          </FormSection>
        ) : null}

        {activeTab === "NOTIFICATIONS" ? (
          <FormSection className="!rounded-[24px]" title="Notifications" description="Notification routing is not currently exposed through the existing backend settings API.">
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
          <FormSection className="!rounded-[24px]" title="Security context" description="Security settings remain controlled by the existing auth and super-admin flows.">
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
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(systemHealth?.components ?? []).map((component) => (
                <div key={component.key} className="admin-shell-muted p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${component.status === "OK" ? "bg-emerald-50 text-emerald-700" : component.status === "ERROR" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {component.key === "database" ? <Database className="h-5 w-5" /> : component.key === "cloudinary" ? <UploadCloud className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="admin-section-label">{component.label}</div>
                      <div className="mt-1 text-base font-black text-slate-950">{component.status}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{component.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        ) : null}

        <div className="sticky bottom-4 z-20">
          <div className="admin-card-elevated flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-blue-100 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(30,99,242,0.12)] backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1E63F2]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-950">Persisted settings</div>
                <div className="text-sm text-slate-500">Saving here updates the live backend settings payload.</div>
              </div>
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

function SettingMetric({
  icon,
  label,
  tone,
  value
}: {
  icon: ReactNode;
  label: string;
  tone: "amber" | "blue" | "green" | "violet";
  value: string;
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-[#1E63F2]",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700"
  }[tone];

  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
        <div className="min-w-0">
          <div className="admin-section-label">{label}</div>
          <div className="mt-1 truncate text-base font-black text-slate-950">{value}</div>
        </div>
      </div>
    </article>
  );
}
