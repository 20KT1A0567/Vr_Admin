import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Globe2, Image as ImageIcon, Link2, Save, Search, ShieldAlert, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FormField } from "components/admin/FormField";
import { FormSection } from "components/admin/FormSection";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import type { Category, CmsPage, Product, SeoSetting, SeoTargetType } from "types";

type SeoForm = {
  pageTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noIndex: boolean;
  sitemapEnabled: boolean;
};

type SeoTarget = {
  key: string;
  label: string;
  description: string;
  targetType: SeoTargetType;
  targetId?: number;
  targetSlug?: string;
};

const emptyForm: SeoForm = {
  pageTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImageUrl: "",
  canonicalUrl: "",
  noIndex: false,
  sitemapEnabled: true
};

function text(value?: string | null) {
  return value?.trim() ?? "";
}

function settingMatchesTarget(setting: SeoSetting, target: SeoTarget) {
  return setting.targetType === target.targetType
    && (setting.targetId ?? null) === (target.targetId ?? null)
    && (setting.targetSlug ?? "") === (target.targetSlug ?? "");
}

function settingToForm(setting?: SeoSetting | null): SeoForm {
  return {
    pageTitle: text(setting?.pageTitle),
    metaDescription: text(setting?.metaDescription),
    metaKeywords: text(setting?.metaKeywords),
    ogImageUrl: text(setting?.ogImageUrl),
    canonicalUrl: text(setting?.canonicalUrl),
    noIndex: setting?.noIndex ?? false,
    sitemapEnabled: setting?.sitemapEnabled ?? true
  };
}

export function SeoManagerPage() {
  const seoQuery = useQuery({ queryKey: ["admin-seo-settings"], queryFn: adminApi.getSeoSettings });
  const productsQuery = useQuery({ queryKey: ["admin-products"], queryFn: () => adminApi.getProducts() });
  const categoriesQuery = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });
  const cmsPagesQuery = useQuery({ queryKey: ["admin-cms-pages"], queryFn: adminApi.getCmsPages });
  const [selectedKey, setSelectedKey] = useState("HOME");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState<SeoForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const targets = useMemo(
    () => buildTargets(productsQuery.data ?? [], categoriesQuery.data ?? [], cmsPagesQuery.data ?? []),
    [categoriesQuery.data, cmsPagesQuery.data, productsQuery.data]
  );
  const selectedTarget = targets.find((target) => target.key === selectedKey) ?? targets[0];
  const selectedSetting = (seoQuery.data ?? []).find((setting) => settingMatchesTarget(setting, selectedTarget));
  const filteredTargets = targets.filter((target) => `${target.label} ${target.description}`.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  const indexedCount = (seoQuery.data ?? []).filter((setting) => setting.sitemapEnabled && !setting.noIndex).length;
  const noIndexCount = (seoQuery.data ?? []).filter((setting) => setting.noIndex).length;

  useEffect(() => {
    setForm(settingToForm(selectedSetting));
  }, [selectedSetting?.id, selectedKey]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "seo");
      setForm((current) => ({ ...current, ogImageUrl: uploaded.url }));
      toast.success("OG image uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload OG image"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSeoSetting({
        targetType: selectedTarget.targetType,
        targetId: selectedTarget.targetId,
        targetSlug: selectedTarget.targetSlug,
        pageTitle: form.pageTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        metaKeywords: form.metaKeywords.trim() || undefined,
        ogImageUrl: form.ogImageUrl.trim() || undefined,
        canonicalUrl: form.canonicalUrl.trim() || undefined,
        noIndex: form.noIndex,
        sitemapEnabled: form.sitemapEnabled
      });
      toast.success("SEO settings saved");
      await seoQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save SEO settings"));
    } finally {
      setSaving(false);
    }
  }

  if (seoQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading || cmsPagesQuery.isLoading) {
    return <div className="admin-card-elevated p-6 text-sm text-slate-500">Loading SEO manager...</div>;
  }

  const error = seoQuery.error ?? productsQuery.error ?? categoriesQuery.error ?? cmsPagesQuery.error;
  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Failed to load SEO manager")}</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Storefront"
        title="SEO Manager"
        description="Control page titles, meta descriptions, canonical URLs, social preview images, no-index flags, and sitemap inclusion from one place."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="SEO Targets" value={String(targets.length)} meta="Home, catalog, products, categories, CMS" icon={<FileSearch className="h-6 w-6" />} variant="glass" />
          <StatCard label="Configured" value={String(seoQuery.data?.length ?? 0)} meta="Records saved" icon={<Save className="h-6 w-6" />} variant="glass" />
          <StatCard label="In Sitemap" value={String(indexedCount)} meta="Enabled and indexable" icon={<Globe2 className="h-6 w-6" />} variant="glass" />
          <StatCard label="No Index" value={String(noIndexCount)} meta="Hidden from search engines" icon={<ShieldAlert className="h-6 w-6" />} variant="glass" />
        </div>
      </PageHeader>

      <form className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]" onSubmit={handleSubmit}>
        <FormSection title="Pages" description="Choose the page or entity to configure.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search pages..." />
          </div>
          <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {filteredTargets.map((target) => {
              const selected = target.key === selectedTarget.key;
              const saved = (seoQuery.data ?? []).some((setting) => settingMatchesTarget(setting, target));
              return (
                <button
                  key={target.key}
                  type="button"
                  onClick={() => setSelectedKey(target.key)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected ? "border-blue-200 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black">{target.label}</div>
                    {saved ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Saved</span> : null}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{target.description}</div>
                </button>
              );
            })}
          </div>
        </FormSection>

        <div className="space-y-5">
          <FormSection title={selectedTarget.label} description={selectedTarget.description}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Page title">
                <input className="admin-input" value={form.pageTitle} onChange={(event) => setForm((current) => ({ ...current, pageTitle: event.target.value }))} />
              </FormField>
              <FormField label="Canonical URL">
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="admin-input pl-11" value={form.canonicalUrl} onChange={(event) => setForm((current) => ({ ...current, canonicalUrl: event.target.value }))} placeholder="https://..." />
                </div>
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Meta description">
                  <textarea className="admin-textarea min-h-[120px]" value={form.metaDescription} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Meta keywords">
                  <input className="admin-input" value={form.metaKeywords} onChange={(event) => setForm((current) => ({ ...current, metaKeywords: event.target.value }))} placeholder="laptops, refurbished laptops, desktops" />
                </FormField>
              </div>
            </div>
          </FormSection>

          <FormSection title="Social preview and crawl controls" description="Control Open Graph preview image, robots indexing, and sitemap inclusion.">
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex aspect-[1.91/1] items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                  {form.ogImageUrl ? <img src={form.ogImageUrl} alt="OG preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
                </div>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                  <UploadCloud className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload OG image"}
                  <input className="sr-only" type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <div className="space-y-4">
                <FormField label="OG image URL">
                  <input className="admin-input" value={form.ogImageUrl} onChange={(event) => setForm((current) => ({ ...current, ogImageUrl: event.target.value }))} placeholder="https://..." />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="admin-shell-muted flex items-center justify-between gap-4 p-4 text-sm font-semibold text-slate-700">
                    No-index page
                    <input type="checkbox" checked={form.noIndex} onChange={(event) => setForm((current) => ({ ...current, noIndex: event.target.checked }))} />
                  </label>
                  <label className="admin-shell-muted flex items-center justify-between gap-4 p-4 text-sm font-semibold text-slate-700">
                    Include in sitemap
                    <input type="checkbox" checked={form.sitemapEnabled} onChange={(event) => setForm((current) => ({ ...current, sitemapEnabled: event.target.checked }))} />
                  </label>
                </div>
              </div>
            </div>
          </FormSection>

          <div className="sticky bottom-4 z-20">
            <div className="admin-card-elevated flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-blue-100 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(30,99,242,0.12)] backdrop-blur sm:px-6">
              <div>
                <div className="text-sm font-black text-slate-950">Save SEO settings</div>
                <div className="text-sm text-slate-500">Changes update storefront meta tags and backend sitemap behavior.</div>
              </div>
              <button className="admin-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold" disabled={saving || uploading} type="submit">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function buildTargets(products: Product[], categories: Category[], pages: CmsPage[]): SeoTarget[] {
  return [
    { key: "HOME", label: "Home page", description: "Homepage title, description, preview, canonical, and sitemap status.", targetType: "HOME" },
    { key: "PRODUCT_LIST", label: "Product listing page", description: "The main /products catalog page.", targetType: "PRODUCT_LIST" },
    ...categories.map((category) => ({
      key: `CATEGORY:${category.id}`,
      label: `Category: ${category.name}`,
      description: category.slug ? `/products?categoryId=${category.id} - ${category.slug}` : `/products?categoryId=${category.id}`,
      targetType: "CATEGORY" as SeoTargetType,
      targetId: category.id,
      targetSlug: category.slug
    })),
    ...products.map((product) => ({
      key: `PRODUCT:${product.id}`,
      label: `Product: ${product.title}`,
      description: product.sku ? `/products/${product.id} - SKU ${product.sku}` : `/products/${product.id}`,
      targetType: "PRODUCT" as SeoTargetType,
      targetId: product.id
    })),
    ...pages.map((page) => ({
      key: `CMS_PAGE:${page.slug}`,
      label: `CMS: ${page.title}`,
      description: `/${page.slug}`,
      targetType: "CMS_PAGE" as SeoTargetType,
      targetId: page.id,
      targetSlug: page.slug
    }))
  ];
}
