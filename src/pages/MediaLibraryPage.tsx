import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Film,
  FolderPlus,
  FolderTree,
  Image as ImageIcon,
  Layers3,
  Package,
  PencilLine,
  Search,
  Tags,
  Trash2,
  Upload,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { FileUploadCard } from "components/admin/FileUploadCard";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { cn } from "utils/cn";

type MediaAssetType = "IMAGE" | "BANNER" | "ICON" | "VIDEO" | "PRODUCT_MEDIA" | "BRAND_ASSET";

type MediaFolder = {
  id: string;
  name: string;
  slug: string;
  description: string;
  locked?: boolean;
};

type MediaAsset = {
  id: string;
  name: string;
  url: string;
  publicId?: string;
  type: MediaAssetType;
  folderId: string;
  altText: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  reusedCount: number;
  lastReusedAt?: string;
};

type UploadFormState = {
  type: MediaAssetType;
  folderId: string;
  altText: string;
};

const MEDIA_FOLDERS_STORAGE_KEY = "vrtech-admin-media-folders";
const MEDIA_ASSETS_STORAGE_KEY = "vrtech-admin-media-assets";

const mediaTypeOptions: Array<{ value: MediaAssetType; label: string; folderSlug: string }> = [
  { value: "IMAGE", label: "Images", folderSlug: "images" },
  { value: "BANNER", label: "Banners", folderSlug: "banners" },
  { value: "ICON", label: "Icons", folderSlug: "icons" },
  { value: "VIDEO", label: "Videos", folderSlug: "videos" },
  { value: "PRODUCT_MEDIA", label: "Product media", folderSlug: "product-media" },
  { value: "BRAND_ASSET", label: "Brand assets", folderSlug: "brand-assets" }
];

const defaultFolders: MediaFolder[] = [
  { id: "images", name: "Images", slug: "images", description: "General storefront photography and artwork.", locked: true },
  { id: "banners", name: "Banners", slug: "banners", description: "Homepage, category, and campaign banner creatives.", locked: true },
  { id: "icons", name: "Icons", slug: "icons", description: "UI glyphs, category icons, and supporting symbols.", locked: true },
  { id: "videos", name: "Videos", slug: "videos", description: "Promotional reels, explainers, and product clips.", locked: true },
  { id: "product-media", name: "Product media", slug: "product-media", description: "Product gallery images, manuals, and rich media.", locked: true },
  { id: "brand-assets", name: "Brand assets", slug: "brand-assets", description: "Logos, partner badges, and brand identity files.", locked: true }
];

const emptyUploadForm: UploadFormState = {
  type: "IMAGE",
  folderId: "images",
  altText: ""
};

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) {
    return "Unknown size";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function folderForType(type: MediaAssetType) {
  return mediaTypeOptions.find((option) => option.value === type)?.folderSlug ?? "images";
}

function humanizeMediaType(type: MediaAssetType) {
  return mediaTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function sanitizeFolderSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assetMatchesType(asset: MediaAsset, filter: MediaAssetType | "ALL") {
  return filter === "ALL" ? true : asset.type === filter;
}

function assetPreview(asset: MediaAsset) {
  if (asset.type === "VIDEO" || asset.mimeType?.startsWith("video/")) {
    return <video src={asset.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />;
  }

  return <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-cover" />;
}

export function MediaLibraryPage() {
  useQuery({
    queryKey: ["admin-media-library-healthcheck"],
    queryFn: () => adminApi.getSettings(),
    staleTime: 300000
  });

  const [folders, setFolders] = useState<MediaFolder[]>(() => readFromStorage(MEDIA_FOLDERS_STORAGE_KEY, defaultFolders));
  const [assets, setAssets] = useState<MediaAsset[]>(() => readFromStorage(MEDIA_ASSETS_STORAGE_KEY, []));
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [folderName, setFolderName] = useState("");

  useEffect(() => {
    writeToStorage(MEDIA_FOLDERS_STORAGE_KEY, folders);
  }, [folders]);

  useEffect(() => {
    writeToStorage(MEDIA_ASSETS_STORAGE_KEY, assets);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets
      .filter((asset) => (activeFolderId === "all" ? true : asset.folderId === activeFolderId))
      .filter((asset) => assetMatchesType(asset, typeFilter))
      .filter((asset) => {
        if (!query) {
          return true;
        }

        const haystack = `${asset.name} ${asset.altText} ${asset.type} ${asset.folderId} ${asset.mimeType ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [activeFolderId, assets, search, typeFilter]);

  const selectedFolder = folders.find((folder) => folder.id === activeFolderId);
  const imageCount = assets.filter((asset) => asset.type !== "VIDEO").length;
  const videoCount = assets.filter((asset) => asset.type === "VIDEO").length;
  const reusableCount = assets.filter((asset) => asset.reusedCount > 0).length;

  function updateAsset(assetId: string, updater: (asset: MediaAsset) => MediaAsset) {
    setAssets((current) => current.map((asset) => (asset.id === assetId ? updater(asset) : asset)));
    setSelectedAsset((current) => (current && current.id === assetId ? updater(current) : current));
  }

  function handleUploadTypeChange(type: MediaAssetType) {
    setUploadForm((current) => ({
      ...current,
      type,
      folderId: current.folderId === emptyUploadForm.folderId || !folders.some((folder) => folder.id === current.folderId) ? folderForType(type) : current.folderId
    }));
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    setUploading(true);
    try {
      const uploadedAssets = await Promise.all(
        files.map(async (file) => {
          const response = await adminApi.uploadMedia(file, uploadForm.folderId);
          const timestamp = new Date().toISOString();
          return {
            id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            url: response.url,
            publicId: response.publicId,
            type: uploadForm.type,
            folderId: uploadForm.folderId,
            altText: uploadForm.altText.trim(),
            mimeType: file.type,
            sizeBytes: file.size,
            createdAt: timestamp,
            updatedAt: timestamp,
            reusedCount: 0
          } satisfies MediaAsset;
        })
      );

      setAssets((current) => [...uploadedAssets, ...current]);
      toast.success(`${uploadedAssets.length} media file${uploadedAssets.length > 1 ? "s" : ""} uploaded`);
      setUploadForm((current) => ({ ...current, altText: "" }));
      if (activeFolderId === "all") {
        setActiveFolderId(uploadForm.folderId);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload media"));
    } finally {
      setUploading(false);
    }
  }

  function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = folderName.trim();
    const slug = sanitizeFolderSlug(name);
    if (!name || !slug) {
      toast.error("Enter a valid folder name");
      return;
    }

    if (folders.some((folder) => folder.slug === slug || folder.id === slug)) {
      toast.error("A folder with this name already exists");
      return;
    }

    const nextFolder: MediaFolder = {
      id: slug,
      slug,
      name,
      description: "Custom media collection"
    };

    setFolders((current) => [...current, nextFolder]);
    setFolderName("");
    setActiveFolderId(nextFolder.id);
    toast.success("Folder created");
  }

  async function handleReuse(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      updateAsset(asset.id, (current) => ({
        ...current,
        reusedCount: current.reusedCount + 1,
        lastReusedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      toast.success("Asset URL copied for reuse");
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  }

  async function handleCopyAltText(asset: MediaAsset) {
    if (!asset.altText.trim()) {
      toast.error("Add alt text first");
      return;
    }

    try {
      await navigator.clipboard.writeText(asset.altText);
      toast.success("Alt text copied");
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      if (pendingDelete.publicId) {
        await adminApi.deleteMedia(pendingDelete.publicId);
      }
      setAssets((current) => current.filter((asset) => asset.id !== pendingDelete.id));
      if (selectedAsset?.id === pendingDelete.id) {
        setSelectedAsset(null);
      }
      toast.success("Media asset deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete media asset"));
    } finally {
      setPendingDelete(null);
    }
  }

  const folderCounts = useMemo(() => {
    return assets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.folderId] = (acc[asset.folderId] ?? 0) + 1;
      return acc;
    }, {});
  }, [assets]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Storefront Asset Desk"
        title="Media Library"
        description="Upload once, organize with folders, add alt text, search instantly, and reuse approved assets across banners, products, and brand surfaces."
        variant="premium"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Library assets" value={String(assets.length)} meta="Images, videos, icons, and brand media" icon={<Layers3 className="h-5 w-5" />} variant="glass" />
          <StatCard label="Image-based assets" value={String(imageCount)} meta="Reusable visual files with alt text support" icon={<ImageIcon className="h-5 w-5" />} variant="glass" />
          <StatCard label="Videos" value={String(videoCount)} meta="Motion assets for banners and product pages" icon={<Film className="h-5 w-5" />} variant="glass" />
          <StatCard label="Reused assets" value={String(reusableCount)} meta="Files already reused by editors" icon={<Copy className="h-5 w-5" />} variant="glass" />
        </div>
      </PageHeader>

      <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="admin-card-elevated space-y-4 border-none bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="admin-section-label">Folders</div>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Asset structure</h2>
              </div>
              <FolderTree className="h-5 w-5 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => setActiveFolderId("all")}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                activeFolderId === "all" ? "border-blue-200 bg-blue-50 text-[#1E63F2]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
              )}
            >
              <span>
                <span className="block text-sm font-black">All media</span>
                <span className="mt-0.5 block text-xs opacity-75">Unified asset view</span>
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">{assets.length}</span>
            </button>

            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                    activeFolderId === folder.id ? "border-blue-200 bg-blue-50 text-[#1E63F2]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{folder.name}</span>
                    <span className="mt-0.5 block truncate text-xs opacity-70">{folder.description}</span>
                  </span>
                  <span className="ml-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{folderCounts[folder.id] ?? 0}</span>
                </button>
              ))}
            </div>

            <form className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4" onSubmit={handleCreateFolder}>
              <div className="text-sm font-black text-slate-900">Create folder</div>
              <input
                className="admin-input"
                placeholder="Seasonal campaigns"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
              />
              <button type="submit" className="admin-button-secondary w-full justify-center rounded-2xl px-4 py-3 text-sm font-bold">
                <FolderPlus className="mr-2 h-4 w-4" />
                Add folder
              </button>
            </form>
          </div>

          <div className="admin-card-elevated border-none bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="admin-section-label">Upload destination</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {folders.find((folder) => folder.id === uploadForm.folderId)?.name ?? "Images"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Files uploaded here are stored through the live admin media endpoint, then indexed locally for search and reuse.
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="admin-card-elevated border-none bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="space-y-3">
                <div>
                  <div className="admin-section-label">Upload media</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Images, banners, icons, videos, and brand files</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="admin-section-label">Asset type</span>
                    <select className="admin-select mt-1" value={uploadForm.type} onChange={(event) => handleUploadTypeChange(event.target.value as MediaAssetType)}>
                      {mediaTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="admin-section-label">Folder</span>
                    <select
                      className="admin-select mt-1"
                      value={uploadForm.folderId}
                      onChange={(event) => setUploadForm((current) => ({ ...current, folderId: event.target.value }))}
                    >
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="admin-section-label">Default alt text</span>
                  <input
                    className="admin-input mt-1"
                    placeholder="Describe the uploaded image for accessibility"
                    value={uploadForm.altText}
                    onChange={(event) => setUploadForm((current) => ({ ...current, altText: event.target.value }))}
                  />
                </label>
              </div>

              <div className="xl:col-span-2">
                <FileUploadCard
                  accept={uploadForm.type === "VIDEO" ? "video/*" : uploadForm.type === "ICON" ? "image/*,.svg" : "*"}
                  title="Drop approved files here"
                  description="You can upload multiple files in one pass. The chosen folder and default alt text will be applied to every asset in this batch."
                  onChange={handleUpload}
                  uploading={uploading}
                  valueLabel={uploadForm.type === "VIDEO" ? "Video mode" : "Image mode"}
                  preview={
                    <div className="grid place-items-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                      <Upload className="h-8 w-8 text-slate-400" />
                      <div className="mt-3 text-sm font-bold text-slate-900">Upload approved media files</div>
                      <div className="mt-1 max-w-md text-xs leading-6 text-slate-500">
                        Assets uploaded here can be searched later, given alt text, and reused in banners, products, brand settings, and other content workflows.
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
          </section>

          <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <div className="admin-section-label">Library search</div>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                  {selectedFolder ? `${selectedFolder.name} assets` : "All uploaded media"}
                </h2>
              </div>

              <div className="flex min-w-[260px] flex-1 flex-wrap items-center justify-end gap-2">
                <label className="relative min-w-[220px] flex-1 md:max-w-[320px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="admin-input pl-10"
                    placeholder="Search filename, alt text, type..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <select className="admin-select min-w-[180px]" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as MediaAssetType | "ALL")}>
                  <option value="ALL">All media types</option>
                  {mediaTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!filteredAssets.length ? (
              <div className="p-5">
                <EmptyState
                  icon={<ImageIcon className="h-7 w-7" />}
                  title={assets.length ? "No assets match the current filters" : "Your media library is empty"}
                  description={
                    assets.length
                      ? "Try another folder, media type, or search phrase."
                      : "Upload your first images, banners, icons, videos, product media, or brand assets to start building the reusable library."
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredAssets.map((asset) => (
                  <article
                    key={asset.id}
                    className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(30,99,242,0.12)]"
                  >
                    <button type="button" className="block w-full text-left" onClick={() => setSelectedAsset(asset)}>
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        {assetPreview(asset)}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span className={asset.type === "VIDEO" ? "admin-badge-amber" : "admin-badge-sky"}>{humanizeMediaType(asset.type)}</span>
                          <span className="admin-badge-slate">{folders.find((folder) => folder.id === asset.folderId)?.name ?? asset.folderId}</span>
                        </div>
                        <div className="absolute right-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-bold text-white">
                          {formatFileSize(asset.sizeBytes)}
                        </div>
                      </div>
                    </button>

                    <div className="space-y-3 p-4">
                      <div>
                        <div className="truncate text-sm font-black text-slate-950">{asset.name}</div>
                        <p className="mt-1 line-clamp-2 min-h-[2.75rem] text-xs leading-5 text-slate-500">
                          {asset.altText || "No alt text added yet"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>Uploaded {formatDate(asset.createdAt)}</span>
                        {asset.reusedCount > 0 ? <span>Reused {asset.reusedCount}x</span> : <span>Not reused yet</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" className="admin-button flex-1 justify-center rounded-2xl px-4 py-2.5 text-xs font-black" onClick={() => void handleReuse(asset)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Reuse asset
                        </button>
                        <button type="button" className="admin-icon-button" onClick={() => setSelectedAsset(asset)} aria-label="Edit asset">
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button type="button" className="admin-icon-button-danger" onClick={() => setPendingDelete(asset)} aria-label="Delete asset">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {selectedAsset ? (
        <MediaAssetDrawer
          asset={selectedAsset}
          folders={folders}
          onClose={() => setSelectedAsset(null)}
          onCopyAltText={handleCopyAltText}
          onDelete={() => setPendingDelete(selectedAsset)}
          onReuse={handleReuse}
          onSave={(nextAsset) => {
            updateAsset(nextAsset.id, () => nextAsset);
            toast.success("Media details saved");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete media asset?"}
        description="This removes the asset from the media library and deletes the uploaded file from remote storage when a public id is available."
        confirmLabel="Delete asset"
        tone="danger"
      />
    </div>
  );
}

function MediaAssetDrawer({
  asset,
  folders,
  onClose,
  onCopyAltText,
  onDelete,
  onReuse,
  onSave
}: {
  asset: MediaAsset;
  folders: MediaFolder[];
  onClose: () => void;
  onCopyAltText: (asset: MediaAsset) => void | Promise<void>;
  onDelete: () => void;
  onReuse: (asset: MediaAsset) => void | Promise<void>;
  onSave: (asset: MediaAsset) => void;
}) {
  const [draft, setDraft] = useState(asset);

  useEffect(() => {
    setDraft(asset);
  }, [asset]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-end bg-slate-950/60 p-0 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="admin-scrollbar h-full w-full max-w-2xl overflow-y-auto bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="admin-section-label">Asset details</div>
            <h2 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{asset.name}</h2>
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Close asset drawer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
            <div className="aspect-[16/10] bg-slate-100">{assetPreview(draft)}</div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Type" value={humanizeMediaType(draft.type)} icon={<Tags className="h-4 w-4" />} />
            <InfoCard label="Folder" value={folders.find((folder) => folder.id === draft.folderId)?.name ?? draft.folderId} icon={<FolderTree className="h-4 w-4" />} />
            <InfoCard label="Uploaded" value={formatDate(draft.createdAt)} icon={<Check className="h-4 w-4" />} />
            <InfoCard label="Reuse count" value={String(draft.reusedCount)} icon={<Copy className="h-4 w-4" />} />
            <InfoCard label="File size" value={formatFileSize(draft.sizeBytes)} icon={<Package className="h-4 w-4" />} />
            <InfoCard label="MIME type" value={draft.mimeType || "Unknown"} icon={<Film className="h-4 w-4" />} />
          </div>

          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
            <label className="block">
              <span className="admin-section-label">Filename</span>
              <input className="admin-input mt-1" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, updatedAt: new Date().toISOString() }))} />
            </label>

            <label className="block">
              <span className="admin-section-label">Alt text</span>
              <textarea
                className="admin-textarea mt-1 min-h-[120px]"
                placeholder="Describe the image for screen readers and SEO."
                value={draft.altText}
                onChange={(event) => setDraft((current) => ({ ...current, altText: event.target.value, updatedAt: new Date().toISOString() }))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="admin-section-label">Asset type</span>
                <select
                  className="admin-select mt-1"
                  value={draft.type}
                  onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as MediaAssetType, updatedAt: new Date().toISOString() }))}
                >
                  {mediaTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="admin-section-label">Folder</span>
                <select
                  className="admin-select mt-1"
                  value={draft.folderId}
                  onChange={(event) => setDraft((current) => ({ ...current, folderId: event.target.value, updatedAt: new Date().toISOString() }))}
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="admin-section-label">Asset URL</span>
              <input className="admin-input mt-1" value={draft.url} readOnly />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="admin-button justify-center rounded-2xl px-4 py-3 text-sm font-black" onClick={() => void onReuse(draft)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL for reuse
            </button>
            <button type="button" className="admin-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-bold" onClick={() => void onCopyAltText(draft)}>
              <Check className="mr-2 h-4 w-4" />
              Copy alt text
            </button>
            <button type="button" className="admin-button-secondary justify-center rounded-2xl px-4 py-3 text-sm font-bold" onClick={() => onSave(draft)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Save changes
            </button>
            <button type="button" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100" onClick={onDelete}>
              <Trash2 className="mr-2 inline h-4 w-4" />
              Delete asset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
