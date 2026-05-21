import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, HelpCircle, LayoutTemplate, Plus, Save, ShieldCheck, Truck, Undo2 } from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import type { CmsPage, CmsPageFaqItem, CmsPageSection } from "types";
import { applyWorkflowStatus, publishWorkflowOptions, type PublishWorkflowStatus, workflowAppearance } from "utils/publishWorkflow";

type CmsPageForm = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  body: string;
  workflowStatus: PublishWorkflowStatus;
  active: boolean;
  startAt: string;
  endAt: string;
  sections: CmsPageSection[];
  faqItems: CmsPageFaqItem[];
};

type CmsWorkflowMeta = {
  workflowStatus: PublishWorkflowStatus;
  startAt?: string;
  endAt?: string;
};

const CMS_WORKFLOW_STORAGE_KEY = "vrtech-admin-cms-workflow";

const pageLabels: Record<string, string> = {
  about: "About Us",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  shipping: "Shipping Policy",
  warranty: "Warranty Policy",
  returns: "Returns Policy",
  contact: "Contact Page",
  faq: "FAQ Page"
};

const pageIcons: Record<string, ReactNode> = {
  about: <LayoutTemplate className="h-4 w-4" />,
  privacy: <ShieldCheck className="h-4 w-4" />,
  terms: <FileText className="h-4 w-4" />,
  shipping: <Truck className="h-4 w-4" />,
  warranty: <ShieldCheck className="h-4 w-4" />,
  returns: <Undo2 className="h-4 w-4" />,
  contact: <LayoutTemplate className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />
};

const emptyForm: CmsPageForm = {
  title: "",
  metaTitle: "",
  metaDescription: "",
  eyebrow: "",
  heroTitle: "",
  heroDescription: "",
  body: "",
  workflowStatus: "DRAFT",
  active: false,
  startAt: "",
  endAt: "",
  sections: [],
  faqItems: []
};

function readWorkflowMeta(): Record<string, CmsWorkflowMeta> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(CMS_WORKFLOW_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, CmsWorkflowMeta>;
  } catch {
    return {};
  }
}

function pageToForm(page?: CmsPage | null): CmsPageForm {
  if (!page) {
    return emptyForm;
  }
  const workflowMeta = readWorkflowMeta()[page.slug];
  return {
    title: page.title ?? "",
    metaTitle: page.metaTitle ?? "",
    metaDescription: page.metaDescription ?? "",
    eyebrow: page.eyebrow ?? "",
    heroTitle: page.heroTitle ?? "",
    heroDescription: page.heroDescription ?? "",
    body: page.body ?? "",
    workflowStatus: workflowMeta?.workflowStatus ?? (page.active ? "PUBLISHED" : "DRAFT"),
    active: page.active,
    startAt: workflowMeta?.startAt ?? "",
    endAt: workflowMeta?.endAt ?? "",
    sections: page.sections?.map((section) => ({ ...section })) ?? [],
    faqItems: page.faqItems?.map((item) => ({ ...item })) ?? []
  };
}

export function CmsPagesPage() {
  const pagesQuery = useQuery({ queryKey: ["admin-cms-pages"], queryFn: adminApi.getCmsPages });
  const pages = pagesQuery.data ?? [];
  const [selectedSlug, setSelectedSlug] = useState("about");
  const [form, setForm] = useState<CmsPageForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const workflowMetaBySlug = useMemo(() => readWorkflowMeta(), [pagesQuery.dataUpdatedAt]);

  const selectedPage = useMemo(() => pages.find((page) => page.slug === selectedSlug) ?? null, [pages, selectedSlug]);

  useEffect(() => {
    if (!pages.length) {
      return;
    }
    if (!pages.some((page) => page.slug === selectedSlug)) {
      setSelectedSlug(pages[0].slug);
      return;
    }
    setForm(pageToForm(selectedPage));
  }, [pages, selectedPage, selectedSlug]);

  async function handleSave() {
    if (!selectedPage) {
      return;
    }

    if (form.workflowStatus === "SCHEDULED" && !form.startAt) {
      toast.error("Choose a publish date for scheduled CMS pages");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        active: form.workflowStatus === "PUBLISHED" || form.workflowStatus === "SCHEDULED"
      };
      await adminApi.updateCmsPage(selectedPage.slug, payload);
      if (typeof window !== "undefined") {
        const nextWorkflowMeta = {
          ...readWorkflowMeta(),
          [selectedPage.slug]: {
            workflowStatus: form.workflowStatus,
            startAt: form.startAt || undefined,
            endAt: form.endAt || undefined
          }
        };
        window.localStorage.setItem(CMS_WORKFLOW_STORAGE_KEY, JSON.stringify(nextWorkflowMeta));
      }
      toast.success("CMS page updated");
      await pagesQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update CMS page"));
    } finally {
      setSaving(false);
    }
  }

  function updateSection(index: number, key: keyof CmsPageSection, value: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (sectionIndex === index ? { ...section, [key]: value } : section))
    }));
  }

  function updateFaq(index: number, key: keyof CmsPageFaqItem, value: string) {
    setForm((current) => ({
      ...current,
      faqItems: current.faqItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    }));
  }

  if (pagesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-28" />
        <SkeletonLoader className="h-[620px]" />
      </div>
    );
  }

  if (pagesQuery.error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(pagesQuery.error, "Failed to load CMS pages")}</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Website Content"
        title="CMS Pages"
        description="Manage core website information pages from admin. The storefront fetches these pages from the backend instead of relying on hardcoded text."
        variant="premium"
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="admin-card space-y-3 p-4">
          {pages.map((page) => {
            const active = page.slug === selectedSlug;
            return (
              <button
                key={page.slug}
                type="button"
                onClick={() => setSelectedSlug(page.slug)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-blue-200 bg-blue-50 text-[#1E63F2]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:border-blue-100 hover:bg-blue-50/60"
                }`}
              >
                <div className="mt-0.5">{pageIcons[page.slug] ?? <FileText className="h-4 w-4" />}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-bold">{pageLabels[page.slug] ?? page.title}</div>
                    <span className={workflowAppearance(workflowMetaBySlug[page.slug]?.workflowStatus ?? (page.active ? "PUBLISHED" : "DRAFT")).className}>
                      {workflowAppearance(workflowMetaBySlug[page.slug]?.workflowStatus ?? (page.active ? "PUBLISHED" : "DRAFT")).label}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">{page.slug}</div>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="admin-card space-y-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-sky-500">Page Editor</div>
              <h2 className="mt-2 text-2xl font-black text-[color:var(--color-text)]">{pageLabels[selectedSlug] ?? selectedPage?.title ?? "CMS Page"}</h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">Hero text, SEO metadata, content sections, and FAQ blocks all live here.</p>
            </div>
            <button type="button" onClick={handleSave} disabled={saving || !selectedPage} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save page"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Page label</span>
              <input className="admin-input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Eyebrow</span>
              <input className="admin-input" value={form.eyebrow} onChange={(event) => setForm((current) => ({ ...current, eyebrow: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Publish workflow</span>
              <select
                className="admin-select"
                value={form.workflowStatus}
                onChange={(event) =>
                  setForm((current) => applyWorkflowStatus({ ...current, workflowStatus: event.target.value as PublishWorkflowStatus }, event.target.value as PublishWorkflowStatus))
                }
              >
                {publishWorkflowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Publish date</span>
              <input className="admin-input" type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Unpublish date</span>
              <input className="admin-input" type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">SEO title</span>
              <input className="admin-input" value={form.metaTitle} onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">SEO description</span>
              <textarea className="admin-input min-h-24 py-3" value={form.metaDescription} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Hero title</span>
              <input className="admin-input" value={form.heroTitle} onChange={(event) => setForm((current) => ({ ...current, heroTitle: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Hero description</span>
              <textarea className="admin-input min-h-28 py-3" value={form.heroDescription} onChange={(event) => setForm((current) => ({ ...current, heroDescription: event.target.value }))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Body copy</span>
              <textarea className="admin-input min-h-36 py-3" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[color:var(--color-text)]">Sections</div>
                <div className="text-xs text-[color:var(--color-text-muted)]">Shown as content cards on the website pages.</div>
              </div>
              <button type="button" onClick={() => setForm((current) => ({ ...current, sections: [...current.sections, { title: "", content: "" }] }))} className="admin-icon-button">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {form.sections.map((section, index) => (
                <div key={`${selectedSlug}-section-${index}`} className="rounded-2xl border border-[color:var(--color-border)] p-4">
                  <div className="grid gap-3">
                    <input className="admin-input" placeholder="Section title" value={section.title ?? ""} onChange={(event) => updateSection(index, "title", event.target.value)} />
                    <textarea className="admin-input min-h-24 py-3" placeholder="Section content" value={section.content ?? ""} onChange={(event) => updateSection(index, "content", event.target.value)} />
                    <button type="button" onClick={() => setForm((current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }))} className="text-left text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
                      Remove section
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[color:var(--color-text)]">FAQ Items</div>
                <div className="text-xs text-[color:var(--color-text-muted)]">Optional question and answer blocks for help-heavy pages.</div>
              </div>
              <button type="button" onClick={() => setForm((current) => ({ ...current, faqItems: [...current.faqItems, { question: "", answer: "" }] }))} className="admin-icon-button">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {form.faqItems.map((item, index) => (
                <div key={`${selectedSlug}-faq-${index}`} className="rounded-2xl border border-[color:var(--color-border)] p-4">
                  <div className="grid gap-3">
                    <input className="admin-input" placeholder="Question" value={item.question ?? ""} onChange={(event) => updateFaq(index, "question", event.target.value)} />
                    <textarea className="admin-input min-h-24 py-3" placeholder="Answer" value={item.answer ?? ""} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
                    <button type="button" onClick={() => setForm((current) => ({ ...current, faqItems: current.faqItems.filter((_, itemIndex) => itemIndex !== index) }))} className="text-left text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
                      Remove FAQ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
