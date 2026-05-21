import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import type {
  Category,
  HomepageBuilderConfig,
  HomepageBuilderSection,
  HomepageBuilderSectionType,
  HomepageBuilderWhyCard,
  SiteSettings
} from "types";

const sectionOptions: Array<{ type: HomepageBuilderSectionType; label: string; description: string }> = [
  { type: "ANNOUNCEMENT_BAR", label: "Announcement Bar", description: "Top strip for notices and urgent promotions." },
  { type: "HERO_BANNER", label: "Hero Banner", description: "Primary campaign banner managed through hero banners." },
  { type: "FEATURED_CATEGORIES", label: "Featured Categories", description: "Selected category cards below the hero area." },
  { type: "FEATURED_PRODUCTS", label: "Featured Products", description: "Featured product grid from live catalog flags." },
  { type: "BEST_SELLERS", label: "Best Sellers", description: "Best sellers section powered by sales-backed ranking." },
  { type: "OFFER_BANNER", label: "Offer Banner", description: "Mid-page offer banners from campaign management." },
  { type: "TRUST_BADGES", label: "Trust Badges", description: "Compact credibility badges for shipping, quality, and support." },
  { type: "WHY_CHOOSE_US", label: "Why Choose Us", description: "Detailed credibility cards with stats and descriptions." }
];

const defaultHomepageBuilderConfig: HomepageBuilderConfig = {
  announcementBar: {
    enabled: false,
    text: "Free pickup and warranty support across our branch network.",
    linkLabel: "Contact support",
    linkUrl: "/contact"
  },
  featuredCategoryIds: [],
  sections: [
    { type: "HERO_BANNER", enabled: true, order: 1 },
    { type: "FEATURED_CATEGORIES", enabled: true, order: 2 },
    { type: "FEATURED_PRODUCTS", enabled: true, order: 3 },
    { type: "BEST_SELLERS", enabled: true, order: 4 },
    { type: "OFFER_BANNER", enabled: true, order: 5 },
    { type: "TRUST_BADGES", enabled: true, order: 6 },
    { type: "WHY_CHOOSE_US", enabled: true, order: 7 },
    { type: "ANNOUNCEMENT_BAR", enabled: false, order: 0 }
  ],
  trustBadges: [
    { label: "12-Month Warranty" },
    { label: "Quality Checked" },
    { label: "7-Day Easy Returns" },
    { label: "Fast Delivery Across India" }
  ],
  whyChooseUsCards: [
    { tone: "blue", stat: "12-Month", title: "Warranty Included", desc: "Every eligible product ships with store-backed carry-in warranty." },
    { tone: "emerald", stat: "100+ Checks", title: "Quality Certified", desc: "Multi-point inspection before every single dispatch." },
    { tone: "amber", stat: "4 Stores", title: "Walk-in Support", desc: "Physical branches for pickup and service." },
    { tone: "rose", stat: "7-Day", title: "Easy Returns", desc: "Hassle-free returns handled directly by our store team." }
  ]
};

function parseHomepageBuilder(settings?: SiteSettings | null): HomepageBuilderConfig {
  if (!settings?.homepageBuilderJson) {
    return defaultHomepageBuilderConfig;
  }
  try {
    const parsed = JSON.parse(settings.homepageBuilderJson) as Partial<HomepageBuilderConfig>;
    return {
      announcementBar: {
        ...defaultHomepageBuilderConfig.announcementBar,
        ...(parsed.announcementBar ?? {})
      },
      featuredCategoryIds: parsed.featuredCategoryIds ?? defaultHomepageBuilderConfig.featuredCategoryIds,
      sections: parsed.sections?.length ? parsed.sections : defaultHomepageBuilderConfig.sections,
      trustBadges: parsed.trustBadges?.length ? parsed.trustBadges : defaultHomepageBuilderConfig.trustBadges,
      whyChooseUsCards: parsed.whyChooseUsCards?.length ? parsed.whyChooseUsCards : defaultHomepageBuilderConfig.whyChooseUsCards
    };
  } catch {
    return defaultHomepageBuilderConfig;
  }
}

function replaceSettingPayload(settings: SiteSettings, homepageBuilderJson: string) {
  return {
    companyName: settings.companyName || "VR Technologies",
    supportEmail: settings.supportEmail || undefined,
    supportPhone: settings.supportPhone || undefined,
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
    companyAddress: settings.companyAddress || undefined,
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
    whatsappNumber: settings.whatsappNumber || undefined,
    homepageBuilderJson,
    orderNotificationsEnabled: settings.orderNotificationsEnabled ?? true,
    paymentNotificationsEnabled: settings.paymentNotificationsEnabled ?? true,
    returnNotificationsEnabled: settings.returnNotificationsEnabled ?? true,
    securityNotice: settings.securityNotice || undefined
  };
}

export function HomepageBuilderPage() {
  const settingsQuery = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.getSettings });
  const categoriesQuery = useQuery({ queryKey: ["admin-homepage-categories"], queryFn: adminApi.getCategories });
  const [saving, setSaving] = useState(false);
  const settings = settingsQuery.data;
  const categories = categoriesQuery.data ?? [];
  const [draft, setDraft] = useState<HomepageBuilderConfig | null>(null);

  const config = useMemo(() => draft ?? parseHomepageBuilder(settings), [draft, settings]);

  function updateSection(type: HomepageBuilderSectionType, patch: Partial<HomepageBuilderSection>) {
    setDraft((current) => {
      const base = current ?? parseHomepageBuilder(settings);
      return {
        ...base,
        sections: base.sections.map((section) => (section.type === type ? { ...section, ...patch } : section))
      };
    });
  }

  function moveSection(type: HomepageBuilderSectionType, direction: -1 | 1) {
    setDraft((current) => {
      const base = current ?? parseHomepageBuilder(settings);
      const ordered = [...base.sections].sort((left, right) => left.order - right.order);
      const index = ordered.findIndex((section) => section.type === type);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return base;
      }
      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return {
        ...base,
        sections: ordered.map((section, sectionIndex) => ({ ...section, order: sectionIndex + 1 }))
      };
    });
  }

  async function saveHomepageBuilder() {
    if (!settings) {
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateSettings(replaceSettingPayload(settings, JSON.stringify(config)));
      toast.success("Homepage builder updated");
      setDraft(null);
      await settingsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update homepage builder"));
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(category: Category) {
    setDraft((current) => {
      const base = current ?? parseHomepageBuilder(settings);
      const exists = base.featuredCategoryIds.includes(category.id);
      return {
        ...base,
        featuredCategoryIds: exists
          ? base.featuredCategoryIds.filter((id) => id !== category.id)
          : [...base.featuredCategoryIds, category.id]
      };
    });
  }

  function updateWhyCard(index: number, patch: Partial<HomepageBuilderWhyCard>) {
    setDraft((current) => {
      const base = current ?? parseHomepageBuilder(settings);
      return {
        ...base,
        whyChooseUsCards: base.whyChooseUsCards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card))
      };
    });
  }

  if (settingsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-28" />
        <SkeletonLoader className="h-[760px]" />
      </div>
    );
  }

  if (settingsQuery.error || categoriesQuery.error || !settings) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(settingsQuery.error ?? categoriesQuery.error, "Failed to load homepage builder")}</div>;
  }

  const orderedSections = [...config.sections].sort((left, right) => left.order - right.order);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Website Content"
        title="Homepage Builder"
        description="Control hero and offer placement, featured categories, trust layers, announcement copy, and overall homepage block order."
        variant="premium"
      />

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-[color:var(--color-text)]">Announcement Bar</div>
            <div className="text-xs text-[color:var(--color-text-muted)]">Optional message strip shown before the hero area.</div>
          </div>
          <button type="button" onClick={saveHomepageBuilder} disabled={saving} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Builder"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr_220px_220px]">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={config.announcementBar.enabled}
              onChange={(event) => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), announcementBar: { ...config.announcementBar, enabled: event.target.checked } }))}
            />
            Show
          </label>
          <input className="admin-input" placeholder="Announcement text" value={config.announcementBar.text} onChange={(event) => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), announcementBar: { ...config.announcementBar, text: event.target.value } }))} />
          <input className="admin-input" placeholder="Link label" value={config.announcementBar.linkLabel ?? ""} onChange={(event) => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), announcementBar: { ...config.announcementBar, linkLabel: event.target.value } }))} />
          <input className="admin-input" placeholder="Link URL" value={config.announcementBar.linkUrl ?? ""} onChange={(event) => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), announcementBar: { ...config.announcementBar, linkUrl: event.target.value } }))} />
        </div>
      </section>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="text-sm font-black text-[color:var(--color-text)]">Section Order</div>
        <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">Arrange the homepage flow. Hero and offer content still use your banner manager assets.</div>
        <div className="mt-5 space-y-3">
          {orderedSections.map((section, index) => {
            const meta = sectionOptions.find((option) => option.type === section.type);
            return (
              <div key={section.type} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-4">
                <GripVertical className="h-4 w-4 text-slate-400" />
                <div className="min-w-[220px] flex-1">
                  <div className="text-sm font-bold text-slate-900">{meta?.label ?? section.type}</div>
                  <div className="mt-1 text-xs text-slate-500">{meta?.description}</div>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={section.enabled} onChange={(event) => updateSection(section.type, { enabled: event.target.checked })} />
                  Show
                </label>
                <button type="button" className="admin-icon-button" onClick={() => moveSection(section.type, -1)} disabled={index === 0}>↑</button>
                <button type="button" className="admin-icon-button" onClick={() => moveSection(section.type, 1)} disabled={index === orderedSections.length - 1}>↓</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="text-sm font-black text-[color:var(--color-text)]">Featured Categories</div>
        <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">Choose which categories appear in the homepage category row.</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const selected = config.featuredCategoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected ? "border-blue-200 bg-blue-50 text-[#1E63F2]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-[color:var(--color-text)]">Trust Badges</div>
            <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">Short credibility badges shown in the homepage trust strip.</div>
          </div>
          <button type="button" onClick={() => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), trustBadges: [...config.trustBadges, { label: "" }] }))} className="admin-icon-button">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {config.trustBadges.map((badge, index) => (
            <div key={`badge-${index}`} className="flex gap-3">
              <input className="admin-input" placeholder="Badge label" value={badge.label} onChange={(event) => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), trustBadges: config.trustBadges.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} />
              <button type="button" className="admin-icon-button" onClick={() => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), trustBadges: config.trustBadges.filter((_, itemIndex) => itemIndex !== index) }))}>×</button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="text-sm font-black text-[color:var(--color-text)]">Why Choose Us Cards</div>
        <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">Edit the four trust cards shown near the bottom of the homepage.</div>
        <div className="mt-5 space-y-4">
          {config.whyChooseUsCards.map((card, index) => (
            <div key={`why-card-${index}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <input className="admin-input" placeholder="Stat" value={card.stat} onChange={(event) => updateWhyCard(index, { stat: event.target.value })} />
                <input className="admin-input" placeholder="Title" value={card.title} onChange={(event) => updateWhyCard(index, { title: event.target.value })} />
                <select className="admin-select" value={card.tone} onChange={(event) => updateWhyCard(index, { tone: event.target.value as HomepageBuilderWhyCard["tone"] })}>
                  <option value="blue">Blue</option>
                  <option value="emerald">Emerald</option>
                  <option value="amber">Amber</option>
                  <option value="rose">Rose</option>
                </select>
                <button type="button" className="admin-icon-button justify-self-start" onClick={() => setDraft((current) => ({ ...(current ?? parseHomepageBuilder(settings)), whyChooseUsCards: config.whyChooseUsCards.filter((_, cardIndex) => cardIndex !== index) }))}>×</button>
              </div>
              <textarea className="admin-input mt-4 min-h-24 py-3" placeholder="Description" value={card.desc} onChange={(event) => updateWhyCard(index, { desc: event.target.value })} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
