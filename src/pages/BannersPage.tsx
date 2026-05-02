import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CalendarDays, ExternalLink, Film, Image as ImageIcon, ImagePlus, Link2, PencilLine, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
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
    default:
      return { label: "Home Hero", className: "admin-badge-violet" };
  }
}

function normalizeDateTimeValue(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  return value.length === 16 ? `${value}:00` : value;
}

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function formatScheduleLabel(value?: string) {
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

export function BannersPage() {
  const { data: banners = [], refetch } = useQuery({ queryKey: ["admin-banners"], queryFn: adminApi.getBanners });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DRAFT">("ALL");
  const [selected, setSelected] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("url");
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return banners
      .filter((banner) => {
        const text = `${banner.title ?? ""} ${banner.subtitle ?? ""} ${banner.linkUrl ?? ""} ${banner.ctaText ?? ""} ${banner.placement ?? ""}`.toLowerCase();
        const queryMatch = !query || text.includes(query);
        const statusMatch =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && banner.active) ||
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

  function startEdit(banner: Banner) {
    setSelected(banner);
    setForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      desktopImageUrl: banner.desktopImageUrl ?? banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl ?? "",
      videoUrl: banner.videoUrl ?? "",
      mediaType: banner.mediaType ?? (banner.videoUrl ? "VIDEO" : "IMAGE"),
      ctaText: banner.ctaText ?? "Shop now",
      linkUrl: banner.linkUrl ?? "",
      placement: banner.placement ?? "HOME_HERO",
      active: banner.active,
      sortOrder: String(banner.sortOrder),
      startAt: toDateTimeInputValue(banner.startAt),
      endAt: toDateTimeInputValue(banner.endAt)
    });
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

    if (!form.desktopImageUrl.trim()) {
      toast.error("Banner desktop image is required");
      return;
    }

    if (form.mediaType === "VIDEO" && !form.videoUrl.trim()) {
      toast.error("Video URL is required for video banners");
      return;
    }

    if (form.startAt && form.endAt && Date.parse(form.endAt) < Date.parse(form.startAt)) {
      toast.error("Banner end date must be after the start date");
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      imageUrl: form.desktopImageUrl.trim(),
      desktopImageUrl: form.desktopImageUrl.trim(),
      mobileImageUrl: form.mobileImageUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      mediaType: form.mediaType,
      ctaText: form.ctaText.trim() || undefined,
      linkUrl: form.linkUrl.trim(),
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
        imageUrl: banner.desktopImageUrl ?? banner.imageUrl,
        desktopImageUrl: banner.desktopImageUrl ?? banner.imageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        videoUrl: banner.videoUrl,
        mediaType: banner.mediaType,
        ctaText: banner.ctaText,
        linkUrl: banner.linkUrl,
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

  const activeCount = banners.filter((banner) => banner.active).length;
  const liveNowCount = banners.filter((banner) => banner.activeNow).length;

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

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Total</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{banners.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Published</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{activeCount}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="admin-section-label">Live now</div>
              <div className="admin-display mt-1 text-3xl font-semibold text-slate-950">{liveNowCount}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
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
                <option value="ACTIVE">Published</option>
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
                return (
                  <article key={banner.id} className="admin-card overflow-hidden p-0">
                    <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
                      {banner.imageUrl ? (
                        <img src={banner.imageUrl} alt={banner.title ?? "Banner"} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-300">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className={placement.className}>{placement.label}</span>
                        <span className={banner.active ? "admin-badge-green" : "admin-badge-slate"}>
                          {banner.active ? "Published" : "Draft"}
                        </span>
                        <span className={banner.mediaType === "VIDEO" ? "admin-badge-amber" : "admin-badge-sky"}>
                          {banner.mediaType === "VIDEO" ? "Video" : "Image"}
                        </span>
                        {banner.active && banner.activeNow === false ? <span className="admin-badge-slate">Scheduled</span> : null}
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
                          className={`admin-chip ${banner.active ? "admin-chip-active" : ""}`}
                          onClick={() => handleToggle(banner)}
                        >
                          {banner.active ? "Unpublish" : "Publish"}
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" className="admin-icon-button" onClick={() => startEdit(banner)} aria-label="Edit">
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button type="button" className="admin-icon-button-danger" onClick={() => handleDelete(banner)} aria-label="Delete">
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

        <form className="admin-shell space-y-5 p-6 lg:sticky lg:top-24 lg:self-start" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="admin-pill">{selected ? "Edit banner" : "New banner"}</div>
              <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">
                {selected ? "Update campaign media" : "Add campaign media"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">Create homepage hero banners with richer media, schedule controls, and better CTA copy.</p>
            </div>
            {selected ? (
              <button type="button" className="admin-icon-button" onClick={resetForm} aria-label="Reset form">
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <FileUploadCard
            title="Desktop banner artwork"
            description="Recommended 1600x720 JPG/PNG. Used as the hero poster and fallback frame for video campaigns."
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
                  Upload a desktop image to preview the campaign.
                </div>
              )
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
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
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-section-label">Mobile banner artwork</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="admin-input"
                  placeholder="Optional mobile image URL"
                  value={form.mobileImageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, mobileImageUrl: event.target.value }))}
                />
                <label className={`admin-button-secondary cursor-pointer whitespace-nowrap ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload("mobileImageUrl", event)} disabled={uploading} />
                </label>
              </div>
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

          {form.mediaType === "VIDEO" ? (
            <div className="admin-upload-card space-y-3">
              <div className="flex items-center justify-between gap-3">
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
                  {uploading ? "Uploading video…" : form.videoUrl ? "Replace video file" : "Click to upload video"}
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
                <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 border border-slate-200">
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-3 sm:grid-cols-2">
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
                {(() => {
                  const placement = placementLabel(form.placement);
                  return <span className={placement.className}>{placement.label}</span>;
                })()}
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

          <button className="admin-button w-full" disabled={uploading}>
            {selected ? "Update banner" : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create banner
              </>
            )}
          </button>
        </form>
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
    </div>
  );
}
