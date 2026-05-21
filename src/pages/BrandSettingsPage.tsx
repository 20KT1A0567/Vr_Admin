import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Globe2, Image as ImageIcon, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Save, UploadCloud, Youtube } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FormField } from "components/admin/FormField";
import { FormSection } from "components/admin/FormSection";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import type { SiteSettings } from "types";

type BrandSettingsForm = {
  logoUrl: string;
  faviconUrl: string;
  companyName: string;
  tagline: string;
  footerDescription: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  companyAddress: string;
  facebookUrl: string;
  instagramUrl: string;
  xUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
};

const emptyForm: BrandSettingsForm = {
  logoUrl: "",
  faviconUrl: "",
  companyName: "",
  tagline: "",
  footerDescription: "",
  supportPhone: "",
  whatsappNumber: "",
  supportEmail: "",
  companyAddress: "",
  facebookUrl: "",
  instagramUrl: "",
  xUrl: "",
  linkedinUrl: "",
  youtubeUrl: ""
};

function text(value?: string | null) {
  return value?.trim() ?? "";
}

function optional(value: string) {
  return value.trim() || undefined;
}

function settingsPayload(settings: SiteSettings, form: BrandSettingsForm) {
  return {
    companyName: form.companyName.trim(),
    logoUrl: form.logoUrl.trim(),
    faviconUrl: form.faviconUrl.trim(),
    tagline: form.tagline.trim(),
    footerDescription: form.footerDescription.trim(),
    supportEmail: optional(form.supportEmail),
    supportPhone: optional(form.supportPhone),
    whatsappNumber: optional(form.whatsappNumber),
    companyAddress: optional(form.companyAddress),
    facebookUrl: form.facebookUrl.trim(),
    instagramUrl: form.instagramUrl.trim(),
    xUrl: form.xUrl.trim(),
    linkedinUrl: form.linkedinUrl.trim(),
    youtubeUrl: form.youtubeUrl.trim(),
    shippingNote: settings.shippingNote || undefined,
    pickupEnabled: settings.pickupEnabled ?? true,
    deliveryEnabled: settings.deliveryEnabled ?? true,
    standardDeliveryCharge: settings.standardDeliveryCharge ?? 0,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    stateDeliveryCharges: settings.stateDeliveryCharges || undefined,
    stateDeliveryWindows: settings.stateDeliveryWindows || undefined,
    estimatedDeliveryDays: settings.estimatedDeliveryDays ?? 5,
    gstEnabled: settings.gstEnabled ?? true,
    gstRate: settings.gstRate ?? 18,
    gstNumber: settings.gstNumber || undefined,
    companyPan: settings.companyPan || undefined,
    defaultHsnCode: settings.defaultHsnCode || undefined,
    companyPincode: settings.companyPincode || undefined,
    invoicePrefix: settings.invoicePrefix || undefined,
    invoicePadding: settings.invoicePadding,
    invoiceNextSequence: settings.invoiceNextSequence,
    invoiceTerms: settings.invoiceTerms || undefined,
    returnPolicy: settings.returnPolicy || undefined,
    defaultCity: settings.defaultCity || undefined,
    defaultState: settings.defaultState || undefined,
    mapLink: settings.mapLink || undefined,
    includeDefaultHomeSections: settings.includeDefaultHomeSections ?? true,
    defaultHomeSectionTypes: settings.defaultHomeSectionTypes || undefined,
    notificationEmailFrom: settings.notificationEmailFrom || undefined,
    notificationReplyTo: settings.notificationReplyTo || undefined,
    homepageBuilderJson: settings.homepageBuilderJson || undefined,
    orderNotificationsEnabled: settings.orderNotificationsEnabled ?? true,
    paymentNotificationsEnabled: settings.paymentNotificationsEnabled ?? true,
    returnNotificationsEnabled: settings.returnNotificationsEnabled ?? true,
    securityNotice: settings.securityNotice || undefined
  };
}

export function BrandSettingsPage() {
  const { data: settings, isLoading, error, refetch } = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.getSettings });
  const [form, setForm] = useState<BrandSettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setForm({
      logoUrl: text(settings.logoUrl),
      faviconUrl: text(settings.faviconUrl),
      companyName: text(settings.companyName) || "VR Technologies",
      tagline: text(settings.tagline),
      footerDescription: text(settings.footerDescription),
      supportPhone: text(settings.supportPhone),
      whatsappNumber: text(settings.whatsappNumber),
      supportEmail: text(settings.supportEmail),
      companyAddress: text(settings.companyAddress),
      facebookUrl: text(settings.facebookUrl),
      instagramUrl: text(settings.instagramUrl),
      xUrl: text(settings.xUrl),
      linkedinUrl: text(settings.linkedinUrl),
      youtubeUrl: text(settings.youtubeUrl)
    });
  }, [settings]);

  const socialCount = useMemo(
    () => [form.facebookUrl, form.instagramUrl, form.xUrl, form.linkedinUrl, form.youtubeUrl].filter((url) => url.trim()).length,
    [form.facebookUrl, form.instagramUrl, form.xUrl, form.linkedinUrl, form.youtubeUrl]
  );

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, field: "logoUrl" | "faviconUrl") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploading(field === "logoUrl" ? "logo" : "favicon");
    try {
      const uploaded = await adminApi.uploadMedia(file, "branding");
      setForm((current) => ({ ...current, [field]: uploaded.url }));
      toast.success(field === "logoUrl" ? "Logo uploaded" : "Favicon uploaded");
    } catch (uploadError) {
      toast.error(getApiErrorMessage(uploadError, "Failed to upload image"));
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      toast.error("Settings are still loading");
      return;
    }
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateSettings(settingsPayload(settings, form));
      toast.success("Brand settings updated");
      await refetch();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, "Failed to update brand settings"));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="admin-card-elevated p-6 text-sm text-slate-500">Loading brand settings...</div>;
  }

  if (error || !settings) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Failed to load brand settings")}</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Storefront"
        title="Brand Settings"
        description="Control the public brand identity, support channels, footer copy, and social links used across the storefront."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Company" value={form.companyName || "Not set"} meta={form.tagline || "Tagline not set"} icon={<Globe2 className="h-6 w-6" />} variant="glass" />
          <StatCard label="Logo" value={form.logoUrl ? "Uploaded" : "Missing"} meta="Header and footer identity" icon={<ImageIcon className="h-6 w-6" />} variant="glass" />
          <StatCard label="Support" value={form.supportPhone || "No phone"} meta={form.supportEmail || "No email"} icon={<Phone className="h-6 w-6" />} variant="glass" />
          <StatCard label="Social Links" value={String(socialCount)} meta="Connected public profiles" icon={<MessageCircle className="h-6 w-6" />} variant="glass" />
        </div>
      </PageHeader>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <FormSection title="Visual identity" description="Upload or paste URLs for the main brand logo and browser favicon.">
            <div className="space-y-5">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                    {form.logoUrl ? <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-contain p-2" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-950">Logo</div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Recommended: square or horizontal PNG/SVG with transparent background.</p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                      <UploadCloud className="h-4 w-4" />
                      {uploading === "logo" ? "Uploading..." : "Upload logo"}
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleUpload(event, "logoUrl")} disabled={Boolean(uploading)} />
                    </label>
                  </div>
                </div>
                <FormField label="Logo URL">
                  <input className="admin-input mt-4" value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://..." />
                </FormField>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                    {form.faviconUrl ? <img src={form.faviconUrl} alt="Favicon preview" className="h-full w-full object-contain p-2" /> : <Globe2 className="h-6 w-6 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-950">Favicon</div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Recommended: 32x32 or 64x64 PNG/ICO.</p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300">
                      <UploadCloud className="h-4 w-4" />
                      {uploading === "favicon" ? "Uploading..." : "Upload favicon"}
                      <input className="sr-only" type="file" accept="image/*,.ico" onChange={(event) => handleUpload(event, "faviconUrl")} disabled={Boolean(uploading)} />
                    </label>
                  </div>
                </div>
                <FormField label="Favicon URL">
                  <input className="admin-input mt-4" value={form.faviconUrl} onChange={(event) => setForm((current) => ({ ...current, faviconUrl: event.target.value }))} placeholder="https://..." />
                </FormField>
              </div>
            </div>
          </FormSection>

          <FormSection title="Brand copy" description="These values are used for public-facing identity and footer messaging.">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Company name" required>
                <input className="admin-input" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
              </FormField>
              <FormField label="Tagline">
                <input className="admin-input" value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="Refurbished. Warranted. Trusted." />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Footer description">
                  <textarea className="admin-textarea min-h-[130px]" value={form.footerDescription} onChange={(event) => setForm((current) => ({ ...current, footerDescription: event.target.value }))} />
                </FormField>
              </div>
            </div>
          </FormSection>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <FormSection title="Support channels" description="Customer contact details shown in the website footer and support touchpoints.">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Support phone">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="admin-input pl-11" value={form.supportPhone} onChange={(event) => setForm((current) => ({ ...current, supportPhone: event.target.value }))} />
                </div>
              </FormField>
              <FormField label="WhatsApp number">
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="admin-input pl-11" value={form.whatsappNumber} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} />
                </div>
              </FormField>
              <FormField label="Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="admin-input pl-11" type="email" value={form.supportEmail} onChange={(event) => setForm((current) => ({ ...current, supportEmail: event.target.value }))} />
                </div>
              </FormField>
              <FormField label="Address">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                  <textarea className="admin-textarea min-h-[96px] pl-11" value={form.companyAddress} onChange={(event) => setForm((current) => ({ ...current, companyAddress: event.target.value }))} />
                </div>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Social media links" description="Add the public URLs customers should see from storefront branding areas.">
            <div className="grid gap-4">
              <SocialField icon={<Facebook className="h-4 w-4" />} label="Facebook" value={form.facebookUrl} onChange={(value) => setForm((current) => ({ ...current, facebookUrl: value }))} />
              <SocialField icon={<Instagram className="h-4 w-4" />} label="Instagram" value={form.instagramUrl} onChange={(value) => setForm((current) => ({ ...current, instagramUrl: value }))} />
              <SocialField icon={<Globe2 className="h-4 w-4" />} label="X / Twitter" value={form.xUrl} onChange={(value) => setForm((current) => ({ ...current, xUrl: value }))} />
              <SocialField icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" value={form.linkedinUrl} onChange={(value) => setForm((current) => ({ ...current, linkedinUrl: value }))} />
              <SocialField icon={<Youtube className="h-4 w-4" />} label="YouTube" value={form.youtubeUrl} onChange={(value) => setForm((current) => ({ ...current, youtubeUrl: value }))} />
            </div>
          </FormSection>
        </div>

        <div className="sticky bottom-4 z-20">
          <div className="admin-card-elevated flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-blue-100 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(30,99,242,0.12)] backdrop-blur sm:px-6">
            <div>
              <div className="text-sm font-black text-slate-950">Save brand settings</div>
              <div className="text-sm text-slate-500">Updates are stored in backend site settings and used by the storefront.</div>
            </div>
            <button className="admin-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold" disabled={saving || Boolean(uploading)} type="submit">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SocialField({ icon, label, value, onChange }: { icon: JSX.Element; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <FormField label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input className="admin-input pl-11" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." />
      </div>
    </FormField>
  );
}
