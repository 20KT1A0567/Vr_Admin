import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, CheckCircle2, Clock3, ExternalLink, Eye, Film, Image as ImageIcon, ImagePlus, Link2, MonitorSmartphone, PencilLine, Plus, RotateCcw, Search, TimerOff, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { FileUploadCard } from "components/admin/FileUploadCard";
import type { Banner } from "types";

type BannerFormState = {
  title: string;
  subtitle: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  videoUrl: string;
  mediaType: NonNullable<Banner["mediaType"]>;
  ctaText: string;
  linkUrl: string;
  placement: NonNullable<Banner["placement"]>;
  active: boolean;
  sortOrder: string;
  startAt: string;
  endAt: string;
};

const emptyForm: BannerFormState = {
  title: "",
  subtitle: "",
  desktopImageUrl: "",
  mobileImageUrl: "",
  videoUrl: "",
  mediaType: "IMAGE",
  ctaText: "Shop now",
  linkUrl: "",
  placement: "HOME_HERO",
  active: true,
  sortOrder: "0",
  startAt: "",
  endAt: ""
};

function placementLabel(placement?: Banner["placement"]) {
  switch (placement) {
    case "HOME_HERO":
      return { label: "Home Hero", className: "admin-badge-violet" };
    case "HOME_MIDDLE":
      return { label: "Home Middle", className: "admin-badge-sky" };
    case "CATEGORY":
      return { label: "Category", className: "admin-badge-slate" };
    case "PRODUCT_DETAIL":
      return { label: "Product Detail", className: "admin-badge-green" };
    case "USE_CASE":
      return { label: "Find the right machine", className: "admin-badge-amber" };
    default:
      return { label: "Home Hero", className: "admin-badge-violet" };
  }
}

function normalizeDateTimeValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  return value.length === 16 ? `${value}:00` : value;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function formatScheduleLabel(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function isExpired(banner: Banner) {
  return Boolean(banner.endAt && Date.parse(banner.endAt) < Date.now());
}

function isScheduled(banner: Banner) {
  return Boolean(banner.startAt && Date.parse(banner.startAt) > Date.now());
}

function bannerStatus(banner: Banner) {
  if (!banner.active) {
    return { label: "Draft", className: "admin-badge-slate", icon: PencilLine };
  }
  if (isExpired(banner)) {
    return { label: "Expired", className: "admin-badge-rose", icon: TimerOff };
  }
  if (isScheduled(banner)) {
    return { label: "Scheduled", className: "admin-badge-amber", icon: Clock3 };
  }
  if (banner.activeNow) {
    return { label: "Live now", className: "admin-badge-green", icon: CheckCircle2 };
  }
  return { label: "Published", className: "admin-badge-sky", icon: CheckCircle2 };
}

export function BannersPage() {
  const { data: banners = [], refetch } = useQuery({ queryKey: ["admin-banners"], queryFn: adminApi.getBanners });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LIVE" | "SCHEDULED" | "EXPIRED" | "DRAFT">("ALL");
  const [selected, setSelected] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("url");
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return banners
      .filter((banner) => {
        const text = `${banner.title ?? ""} ${banner.subtitle ?? ""} ${banner.linkUrl ?? ""} ${banner.ctaText ?? ""} ${banner.placement ?? ""}`.toLowerCase();
        const queryMatch = !query || text.includes(query);
        const statusMatch =
          statusFilter === "ALL" ||
          (statusFilter === "LIVE" && banner.activeNow) ||
          (statusFilter === "SCHEDULED" && banner.active && isScheduled(banner)) ||
          (statusFilter === "EXPIRED" && banner.active && isExpired(banner)) ||
          (statusFilter === "DRAFT" && !banner.active);
        return queryMatch && statusMatch;
      })
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, search, statusFilter]);

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function openCreateForm() {
    setSelected(null);
    setForm(emptyForm);
    setVideoInputMode("url");
    setIsComposerOpen(true);
  }

  function closeComposer() {
    resetForm();
    setIsComposerOpen(false);
  }

  function startEdit(banner: Banner) {
    setSelected(banner);
    setForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      desktopImageUrl: text(banner.desktopImageUrl ?? banner.imageUrl),
      mobileImageUrl: text(banner.mobileImageUrl),
      videoUrl: text(banner.videoUrl),
      mediaType: banner.mediaType ?? (banner.videoUrl ? "VIDEO" : "IMAGE"),
      ctaText: text(banner.ctaText) || "Shop now",
      linkUrl: text(banner.linkUrl),
      placement: banner.placement ?? "HOME_HERO",
      active: banner.active,
      sortOrder: String(banner.sortOrder),
      startAt: toDateTimeInputValue(banner.startAt),
      endAt: toDateTimeInputValue(banner.endAt)
    });
    setVideoInputMode(banner.videoUrl ? "url" : "upload");
    setIsComposerOpen(true);
  }

  async function handleUpload(field: "desktopImageUrl" | "mobileImageUrl", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "banners");
      setForm((current) => ({ ...current, [field]: uploaded.url }));
      toast.success(field === "mobileImageUrl" ? "Mobile banner image uploaded" : "Desktop banner image uploaded");
    } catch {
      toast.error("Failed to upload banner image");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = await adminApi.uploadMedia(file, "banners");
      setForm((current) => ({ ...current, videoUrl: uploaded.url }));
      toast.success("Banner video uploaded");
    } catch {
      toast.error("Failed to upload banner video");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const desktopImageUrl = text(form.desktopImageUrl).trim();
    const mobileImageUrl = text(form.mobileImageUrl).trim();
    const videoUrl = text(form.videoUrl).trim();
    const title = text(form.title).trim();
    const subtitle = text(form.subtitle).trim();
    const ctaText = text(form.ctaText).trim();
    const linkUrl = text(form.linkUrl).trim();

    if (form.mediaType === "IMAGE" && !desktopImageUrl) {
      toast.error("Banner desktop image is required");
      return;
    }

    if (form.mediaType === "VIDEO" && !videoUrl) {
      toast.error("Video URL is required for video banners");
      return;
    }

    if (form.startAt && form.endAt && Date.parse(form.endAt) < Date.parse(form.startAt)) {
      toast.error("Banner end date must be after the start date");
      return;
    }

    const payload = {
      title,
      subtitle,
      imageUrl: desktopImageUrl || undefined,
      desktopImageUrl: desktopImageUrl || undefined,
      mobileImageUrl: mobileImageUrl || undefined,
      videoUrl: videoUrl || undefined,
      mediaType: form.mediaType,
      ctaText: ctaText || undefined,
      linkUrl,
      placement: form.placement,
      active: form.active,
      sortOrder: Number(form.sortOrder || "0"),
      startAt: normalizeDateTimeValue(form.startAt),
      endAt: normalizeDateTimeValue(form.endAt)
    };

    try {
      if (selected) {
        await adminApi.updateBanner(selected.id, payload);
        toast.success("Banner updated");
      } else {
        await adminApi.createBanner(payload);
        toast.success("Banner created");
      }
      resetForm();
      setIsComposerOpen(false);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update banner" : "Failed to create banner"));
    }
  }

  async function handleDelete(banner: Banner) {
    setPendingDelete(banner);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await adminApi.deleteBanner(pendingDelete.id);
      toast.success("Banner deleted");
      if (selected?.id === pendingDelete.id) resetForm();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete banner"));
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleToggle(banner: Banner) {
    try {
      await adminApi.updateBanner(banner.id, {
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: text(banner.desktopImageUrl ?? banner.imageUrl) || undefined,
        desktopImageUrl: text(banner.desktopImageUrl ?? banner.imageUrl) || undefined,
        mobileImageUrl: text(banner.mobileImageUrl) || undefined,
        videoUrl: text(banner.videoUrl) || undefined,
        mediaType: banner.mediaType,
        ctaText: banner.ctaText,
        linkUrl: text(banner.linkUrl),
        placement: banner.placement,
        active: !banner.active,
        sortOrder: banner.sortOrder,
        startAt: banner.startAt,
        endAt: banner.endAt
      });
      toast.success(banner.active ? "Banner unpublished" : "Banner published");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to toggle banner"));
    }
  }

  async function handleRenewBanner(banner: Banner) {
    try {
      await adminApi.updateBanner(banner.id, {
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: text(banner.desktopImageUrl ?? banner.imageUrl) || undefined,
        desktopImageUrl: text(banner.desktopImageUrl ?? banner.imageUrl) || undefined,
        mobileImageUrl: text(banner.mobileImageUrl) || undefined,
        videoUrl: text(banner.videoUrl) || undefined,
        mediaType: banner.mediaType,
        ctaText: banner.ctaText,
        linkUrl: text(banner.linkUrl),
        placement: banner.placement,
        active: true,
        sortOrder: banner.sortOrder,
        startAt: null,
        endAt: null
      });
      toast.success("Banner renewed and live");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to renew banner"));
    }
  }

  const activeCount = banners.filter((banner) => banner.active).length;
  const liveNowCount = banners.filter((banner) => banner.activeNow).length;
  const expiredCount = banners.filter((banner) => banner.active && isExpired(banner)).length;

  if (isComposerOpen) {
    const placement = placementLabel(form.placement);

    return (
      <div className="space-y-5">
        <section className="admin-shell px-6 py-5 lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button type="button" className="admin-button-secondary inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-bold" onClick={closeComposer}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to banners
              </button>
              <div className="admin-pill mt-5">{selected ? "Edit banner" : "New banner"}</div>
              <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">
                {selected ? "Update campaign banner" : "Create campaign banner"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Build a complete desktop and mobile campaign with media, CTA copy, targeting, display priority, and publish windows in one focused workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selected ? (
                <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="Reset form">
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
              <button type="submit" form="banner-editor-form" className="admin-button justify-center rounded-2xl px-5 py-3 text-sm font-black" disabled={uploading}>
                {selected ? "Update banner" : "Post banner"}
              </button>
            </div>
          </div>
        </section>

        <form id="banner-editor-form" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <section className="admin-shell space-y-5 p-6">
              <div>
                <div className="admin-section-label">Campaign media</div>
                <h2 className="admin-display mt-2 text-xl font-semibold text-slate-950">Artwork and banner type</h2>
              </div>

              <FileUploadCard
                title={form.mediaType === "VIDEO" ? "Desktop banner artwork (optional)" : "Desktop banner artwork"}
                description={
                  form.mediaType === "VIDEO"
                    ? "Optional 1600x720 JPG/PNG. Shown as a poster while the video loads."
                    : "Recommended 1600x720 JPG/PNG. Used as the hero artwork across desktop screens."
                }
                uploading={uploading}
                valueLabel={form.desktopImageUrl ? "Artwork ready" : undefined}
                onChange={(event) => handleUpload("desktopImageUrl", event)}
                preview={
                  form.desktopImageUrl ? (
                    <div className="relative aspect-[16/8]">
                      <img src={form.desktopImageUrl} alt="Banner preview" className="h-full w-full object-cover" />
                      {form.mediaType === "VIDEO" && form.videoUrl ? (
                        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                          <Film className="h-3.5 w-3.5" />
                          Video banner
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="admin-upload-placeholder">
                      {form.mediaType === "VIDEO" ? "Optional poster image for the video banner." : "Upload a desktop image to preview the campaign."}
                    </div>
                  )
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-section-label">Media type</label>
                  <select
                    className="admin-select mt-1"
                    value={form.mediaType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mediaType: event.target.value as BannerFormState["mediaType"]
                      }))
                    }
                  >
                    <option value="IMAGE">Image banner</option>
                    <option value="VIDEO">Video banner</option>
                  </select>
                </div>

                <div>
                  <label className="admin-section-label">Placement</label>
                  <select
                    className="admin-select mt-1"
                    value={form.placement}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        placement: event.target.value as BannerFormState["placement"]
                      }))
                    }
                  >
                    <option value="HOME_HERO">Home hero</option>
                    <option value="HOME_MIDDLE">Home middle</option>
                    <option value="CATEGORY">Category page</option>
                    <option value="PRODUCT_DETAIL">Product detail</option>
                    <option value="USE_CASE">Find the right machine (use case)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-section-label">Mobile banner artwork</label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="admin-input"
                    placeholder="Optional mobile image URL"
                    value={form.mobileImageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, mobileImageUrl: event.target.value }))}
                  />
                  <label className={`admin-button-secondary cursor-pointer justify-center whitespace-nowrap ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload("mobileImageUrl", event)} disabled={uploading} />
                  </label>
                </div>
              </div>

              {form.mediaType === "VIDEO" ? (
                <div className="admin-upload-card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="admin-section-label">Video</div>
                      <p className="mt-0.5 text-xs text-slate-500">Upload an MP4/WebM file or paste a direct video URL.</p>
                    </div>
                    <div className="admin-segmented-control">
                      <button
                        type="button"
                        onClick={() => setVideoInputMode("upload")}
                        className={videoInputMode === "upload" ? "admin-segmented-option admin-segmented-option-active" : "admin-segmented-option"}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload file
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoInputMode("url")}
                        className={videoInputMode === "url" ? "admin-segmented-option admin-segmented-option-active" : "admin-segmented-option"}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Paste URL
                      </button>
                    </div>
                  </div>

                  {videoInputMode === "upload" ? (
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 transition hover:border-slate-400 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                      <Film className="h-5 w-5 text-slate-400" />
                      {uploading ? "Uploading video..." : form.videoUrl ? "Replace video file" : "Click to upload video"}
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                    </label>
                  ) : (
                    <input
                      className="admin-input"
                      placeholder="https://example.com/video.mp4"
                      value={form.videoUrl}
                      onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                    />
                  )}

                  {form.videoUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      <Film className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate font-medium text-slate-700">{form.videoUrl}</span>
                      <button
                        type="button"
                        className="ml-auto shrink-0 text-red-500 hover:text-red-700"
                        onClick={() => setForm((current) => ({ ...current, videoUrl: "" }))}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="admin-shell space-y-4 p-6">
              <div>
                <div className="admin-section-label">Campaign copy</div>
                <h2 className="admin-display mt-2 text-xl font-semibold text-slate-950">Title, subtitle, CTA, and target</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-section-label">Title</label>
                  <input
                    className="admin-input mt-1"
                    placeholder="Premium refurbished laptop deals"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-section-label">CTA text</label>
                  <input
                    className="admin-input mt-1"
                    placeholder="Shop now"
                    value={form.ctaText}
                    onChange={(event) => setForm((current) => ({ ...current, ctaText: event.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="admin-section-label">Subtitle</label>
                <input
                  className="admin-input mt-1"
                  placeholder="Top brands, tested quality, warranty included"
                  value={form.subtitle}
                  onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                />
              </div>

              <div>
                <label className="admin-section-label">Target link</label>
                <input
                  className="admin-input mt-1"
                  placeholder="/products or https://..."
                  value={form.linkUrl}
                  onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
                />
              </div>
            </section>

            <section className="admin-shell space-y-4 p-6">
              <div>
                <div className="admin-section-label">Publishing controls</div>
                <h2 className="admin-display mt-2 text-xl font-semibold text-slate-950">Schedule and ordering</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-section-label">Start date</label>
                  <div className="relative mt-1">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      className="admin-input pl-11"
                      value={form.startAt}
                      onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-section-label">End date</label>
                  <div className="relative mt-1">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      className="admin-input pl-11"
                      value={form.endAt}
                      onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="admin-section-label">Display priority</label>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => setForm((current) => ({ ...current, sortOrder: String(Math.max(0, Number(current.sortOrder || "0") - 1)) }))}
                      aria-label="Decrease priority"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <input
                      className="admin-input text-center"
                      inputMode="numeric"
                      value={form.sortOrder}
                      onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value.replace(/[^0-9]/g, "") }))}
                    />
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => setForm((current) => ({ ...current, sortOrder: String(Number(current.sortOrder || "0") + 1) }))}
                      aria-label="Increase priority"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Lower numbers display first within the selected placement.</p>
                </div>

                <div>
                  <label className="admin-section-label">Placement preview</label>
                  <div className="mt-1">
                    <span className={placement.className}>{placement.label}</span>
                  </div>
                </div>
              </div>

              <label className="admin-check-card cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Publish this banner on the website
              </label>
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="admin-shell overflow-hidden p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="admin-section-label">Live preview</div>
                <h2 className="mt-1 text-base font-black text-slate-950">{form.title || "Untitled campaign"}</h2>
              </div>
              <div className="bg-slate-950 p-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-900">
                  {form.mediaType === "VIDEO" && form.videoUrl ? (
                    <video src={form.videoUrl} poster={form.desktopImageUrl || undefined} muted loop playsInline className="h-full w-full object-cover" />
                  ) : form.desktopImageUrl ? (
                    <img src={form.desktopImageUrl} alt="Banner preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-center text-white/50">
                      <ImageIcon className="mx-auto h-10 w-10" />
                      <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em]">No artwork yet</div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4">
                    <div className="text-lg font-black text-white">{form.title || "Campaign title"}</div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">{form.subtitle || "Campaign subtitle preview"}</p>
                    {form.ctaText ? <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950">{form.ctaText}</span> : null}
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <PreviewInfo label="Placement" value={placement.label} />
                <PreviewInfo label="Priority" value={form.sortOrder || "0"} />
                <PreviewInfo label="Starts" value={form.startAt ? formatScheduleLabel(normalizeDateTimeValue(form.startAt)) ?? "Scheduled" : "Immediately"} />
                <PreviewInfo label="Ends" value={form.endAt ? formatScheduleLabel(normalizeDateTimeValue(form.endAt)) ?? "Scheduled" : "No end date"} />
                <PreviewInfo label="Link" value={form.linkUrl || "No target link"} breakAll />
              </div>
            </section>

            <div className="admin-shell p-4">
              <button className="admin-button w-full justify-center rounded-2xl px-4 py-3 text-sm font-black" disabled={uploading}>
                {selected ? "Update banner" : "Post banner"}
              </button>
            </div>
          </aside>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Banners</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950 lg:text-4xl">Premium campaign banners</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage image or video banners with desktop/mobile artwork, CTA copy, homepage placement, and scheduled publish windows.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
            <button type="button" className="admin-button justify-center rounded-2xl px-5 py-3 text-sm font-black" onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Post banner
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Total</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{banners.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Enabled</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{activeCount}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Live now</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{liveNowCount}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Expired</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{expiredCount}</div>
            </article>
        </div>
      </section>

      <div className="grid gap-5">
        <section className="space-y-4">
          <div className="admin-shell p-5">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="admin-input pl-11"
                  placeholder="Search title, subtitle, CTA, or link"
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
                <option value="LIVE">Live now</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EXPIRED">Expired</option>
                <option value="DRAFT">Draft</option>
              </select>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                {filtered.length} shown
              </div>
            </div>
          </div>

          {!filtered.length ? (
            <EmptyState
              icon={<ImageIcon className="h-7 w-7" />}
              title="No banners match your filters"
              description="Campaign media created here drives homepage heroes, category promotions, and scheduled brand pushes."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((banner) => {
                const placement = placementLabel(banner.placement);
                const status = bannerStatus(banner);
                const StatusIcon = status.icon;
                const mediaUrl = text(banner.desktopImageUrl ?? banner.imageUrl);
                return (
                  <article
                    key={banner.id}
                    className="admin-card group cursor-pointer overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(30,99,242,0.16)]"
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewBanner(banner)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPreviewBanner(banner);
                      }
                    }}
                  >
                    <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
                      {banner.mediaType === "VIDEO" && banner.videoUrl ? (
                        <video
                          src={banner.videoUrl}
                          poster={mediaUrl || undefined}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : mediaUrl ? (
                        <img src={mediaUrl} alt={banner.title ?? "Banner"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="grid h-full place-items-center bg-slate-950 text-white">
                          <div className="text-center">
                            <Film className="mx-auto h-10 w-10 text-white/60" />
                            <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white/70">Video banner</div>
                          </div>
                        </div>
                      )}
                      {banner.mediaType === "VIDEO" ? (
                        <div className="absolute inset-0 grid place-items-center bg-slate-950/10">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg">
                            <Film className="h-5 w-5" />
                          </span>
                        </div>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-3 pt-12 opacity-0 transition group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm">
                          <Eye className="h-3.5 w-3.5" />
                          Preview banner
                        </span>
                        <span className="text-xs font-semibold text-white/80">Click anywhere</span>
                      </div>
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className={placement.className}>{placement.label}</span>
                        <span className={status.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </span>
                        <span className={banner.mediaType === "VIDEO" ? "admin-badge-amber" : "admin-badge-sky"}>
                          {banner.mediaType === "VIDEO" ? "Video" : "Image"}
                        </span>
                      </div>
                      <div className="absolute right-3 top-3">
                        <span className="admin-badge-slate">Priority {banner.sortOrder}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-950">{banner.title || "Untitled banner"}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{banner.subtitle || "No subtitle added yet"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          {banner.ctaText ? <span>CTA: {banner.ctaText}</span> : null}
                          {banner.startAt ? <span>Starts {formatScheduleLabel(banner.startAt)}</span> : null}
                          {banner.endAt ? <span>Ends {formatScheduleLabel(banner.endAt)}</span> : null}
                        </div>
                        {banner.linkUrl ? (
                          <a
                            href={banner.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {banner.linkUrl}
                          </a>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className={`admin-chip ${banner.active && !isExpired(banner) ? "admin-chip-active" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isExpired(banner)) {
                              handleRenewBanner(banner);
                              return;
                            }
                            handleToggle(banner);
                          }}
                        >
                          {isExpired(banner) ? "Renew" : banner.active ? "Unpublish" : "Publish"}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEdit(banner);
                            }}
                            aria-label="Edit"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button-danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(banner);
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.title || "this banner"}?` : "Delete banner?"}
        description="This removes the campaign asset and its scheduling metadata from the admin banner system."
        confirmLabel="Delete banner"
        tone="danger"
      />

      {previewBanner ? (
        <BannerPreviewModal
          banner={previewBanner}
          onClose={() => setPreviewBanner(null)}
          onDelete={() => {
            setPendingDelete(previewBanner);
            setPreviewBanner(null);
          }}
          onEdit={() => {
            startEdit(previewBanner);
            setPreviewBanner(null);
          }}
          onToggle={async () => {
            await handleToggle(previewBanner);
            setPreviewBanner(null);
          }}
          onRenew={async () => {
            await handleRenewBanner(previewBanner);
            setPreviewBanner(null);
          }}
        />
      ) : null}
    </div>
  );
}

function BannerPreviewModal({
  banner,
  onClose,
  onDelete,
  onEdit,
  onRenew,
  onToggle
}: {
  banner: Banner;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRenew: () => void | Promise<void>;
  onToggle: () => void | Promise<void>;
}) {
  const placement = placementLabel(banner.placement);
  const mediaUrl = text(banner.desktopImageUrl ?? banner.imageUrl);
  const status = bannerStatus(banner);
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true">
      <div className="admin-card-elevated max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[22px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] sm:rounded-[28px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={placement.className}>{placement.label}</span>
              <span className={status.className}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {status.label}
              </span>
              <span className={banner.mediaType === "VIDEO" ? "admin-badge-amber" : "admin-badge-sky"}>{banner.mediaType === "VIDEO" ? "Video" : "Image"}</span>
            </div>
            <h2 className="mt-2 truncate text-xl font-black text-slate-950">{banner.title || "Untitled banner"}</h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="admin-scrollbar grid max-h-[calc(92vh-5rem)] overflow-y-auto xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="bg-slate-950 p-3 sm:p-6">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 shadow-2xl">
              <div className="relative aspect-[16/9] bg-slate-900 sm:aspect-[16/8]">
                {banner.mediaType === "VIDEO" && banner.videoUrl ? (
                  <video src={banner.videoUrl} poster={mediaUrl || undefined} controls playsInline className="h-full w-full object-cover" />
                ) : mediaUrl ? (
                  <img src={mediaUrl} alt={banner.title ?? "Banner preview"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-slate-500">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-5">
                  <div className="max-w-2xl">
                    <div className="text-2xl font-black text-white">{banner.title || "Untitled campaign"}</div>
                    {banner.subtitle ? <p className="mt-2 text-sm leading-6 text-white/78">{banner.subtitle}</p> : null}
                    {banner.ctaText ? (
                      <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg">
                        {banner.ctaText}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {banner.mobileImageUrl ? (
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                  <MonitorSmartphone className="h-4 w-4" />
                  Mobile artwork
                </div>
                <img src={banner.mobileImageUrl} alt="Mobile banner preview" className="max-h-96 rounded-2xl object-contain" />
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
            <PreviewInfo label="Priority" value={String(banner.sortOrder)} />
            <PreviewInfo label="CTA" value={banner.ctaText || "Not set"} />
            <PreviewInfo label="Starts" value={formatScheduleLabel(banner.startAt) ?? "Immediately"} />
            <PreviewInfo label="Ends" value={formatScheduleLabel(banner.endAt) ?? "No end date"} />
            <PreviewInfo label="Link" value={banner.linkUrl || "No target link"} breakAll />

            <div className="grid gap-2 pt-2">
              {banner.linkUrl ? (
                <a className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold" href={banner.linkUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open target
                </a>
              ) : null}
              <button type="button" className="admin-button inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold" onClick={onEdit}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit banner
              </button>
              <button
                type="button"
                className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold"
                onClick={() => void (isExpired(banner) ? onRenew() : onToggle())}
              >
                {isExpired(banner) ? "Renew banner now" : banner.active ? "Unpublish banner" : "Publish banner"}
              </button>
              <button type="button" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100" onClick={onDelete}>
                Delete banner
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PreviewInfo({ breakAll, label, value }: { breakAll?: boolean; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="admin-section-label">{label}</div>
      <div className={`mt-2 text-sm font-semibold text-slate-800 ${breakAll ? "break-all" : ""}`}>{value}</div>
    </div>
  );
}
