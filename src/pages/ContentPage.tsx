import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import type { Banner, Brand, Category } from "types";

type ContentFocus = "all" | "brands" | "categories" | "banners";

interface ContentPageProps {
  focus?: ContentFocus;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const heroCopy: Record<ContentFocus, { label: string; title: string; description: string }> = {
  all: {
    label: "Content Control",
    title: "Manage brands, categories, and homepage campaigns from one admin workspace.",
    description: "This page now follows the reference admin panel style and keeps the storefront content system together."
  },
  brands: {
    label: "Brands",
    title: "Manage the manufacturer layer behind product filters and listing metadata.",
    description: "Create and edit brand records with logos and keep the catalog cleaner for browsing."
  },
  categories: {
    label: "Categories",
    title: "Control the product groups that shape navigation, filters, and homepage cards.",
    description: "This category manager is aligned with the reference design and keeps navigation data editable."
  },
  banners: {
    label: "Banners",
    title: "Publish storefront hero banners and campaign slots from the admin panel.",
    description: "This view keeps homepage campaigns manageable without hardcoding banner assets."
  }
};

export function ContentPage({ focus = "all" }: ContentPageProps) {
  const { data: brands = [], refetch: refetchBrands } = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.getBrands });
  const { data: categories = [], refetch: refetchCategories } = useQuery({ queryKey: ["admin-categories"], queryFn: adminApi.getCategories });
  const { data: banners = [], refetch: refetchBanners } = useQuery({ queryKey: ["admin-banners"], queryFn: adminApi.getBanners });

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const [brandForm, setBrandForm] = useState({ name: "", logoUrl: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", iconUrl: "" });
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", imageUrl: "", linkUrl: "", active: true, sortOrder: "0" });
  const [uploading, setUploading] = useState<null | "brand" | "category" | "banner">(null);

  const hero = heroCopy[focus];

  const orderedSections = useMemo(() => {
    const baseOrder: Array<Exclude<ContentFocus, "all">> = ["brands", "categories", "banners"];
    if (focus === "all") {
      return baseOrder;
    }
    return [focus, ...baseOrder.filter((section) => section !== focus)];
  }, [focus]);

  function resetBrand() {
    setSelectedBrand(null);
    setBrandForm({ name: "", logoUrl: "" });
  }

  function resetCategory() {
    setSelectedCategory(null);
    setCategoryForm({ name: "", slug: "", iconUrl: "" });
  }

  function resetBanner() {
    setSelectedBanner(null);
    setBannerForm({ title: "", subtitle: "", imageUrl: "", linkUrl: "", active: true, sortOrder: "0" });
  }

  async function uploadAsset(type: "brand" | "category" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploading(type);
    try {
      const folder = type === "banner" ? "banners" : "catalog";
      const uploaded = await adminApi.uploadMedia(file, folder);
      if (type === "brand") {
        setBrandForm((current) => ({ ...current, logoUrl: uploaded.url }));
      } else if (type === "category") {
        setCategoryForm((current) => ({ ...current, iconUrl: uploaded.url }));
      } else {
        setBannerForm((current) => ({ ...current, imageUrl: uploaded.url }));
      }
      toast.success("Asset uploaded");
    } catch {
      toast.error("Failed to upload asset");
    } finally {
      setUploading(null);
    }
  }

  async function submitBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = brandForm.name.trim();
    const logoUrl = brandForm.logoUrl.trim();

    if (!name) {
      toast.error("Brand name is required");
      return;
    }

    const alreadyExists = brands.some((brand) => brand.id !== selectedBrand?.id && brand.name.trim().toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      toast.error("Brand name already exists");
      return;
    }

    try {
      if (selectedBrand) {
        await adminApi.updateBrand(selectedBrand.id, { name, logoUrl: logoUrl || undefined });
        toast.success("Brand updated");
      } else {
        await adminApi.createBrand({ name, logoUrl: logoUrl || undefined });
        toast.success("Brand created");
      }
      resetBrand();
      await refetchBrands();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selectedBrand ? "Failed to update brand" : "Failed to create brand"));
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...categoryForm,
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim() || slugify(categoryForm.name),
      iconUrl: categoryForm.iconUrl.trim() || undefined
    };

    if (!payload.name) {
      toast.error("Category name is required");
      return;
    }

    try {
      if (selectedCategory) {
        await adminApi.updateCategory(selectedCategory.id, payload);
        toast.success("Category updated");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Category created");
      }

      resetCategory();
      await refetchCategories();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selectedCategory ? "Failed to update category" : "Failed to create category"));
    }
  }

  async function submitBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim(),
      imageUrl: bannerForm.imageUrl.trim(),
      linkUrl: bannerForm.linkUrl.trim(),
      active: bannerForm.active,
      sortOrder: Number(bannerForm.sortOrder || "0")
    };

    try {
      if (selectedBanner) {
        await adminApi.updateBanner(selectedBanner.id, payload);
        toast.success("Banner updated");
      } else {
        await adminApi.createBanner(payload);
        toast.success("Banner created");
      }

      resetBanner();
      await refetchBanners();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selectedBanner ? "Failed to update banner" : "Failed to create banner"));
    }
  }

  function panelClass(section: Exclude<ContentFocus, "all">) {
    return `admin-shell space-y-5 p-6 ${focus !== "all" && focus === section ? "ring-2 ring-emerald-200" : ""}`;
  }

  function mediaUploadCard(
    type: "brand" | "category" | "banner",
    preview: ReactNode,
    hasValue: boolean,
    copy: { title: string; upload: string; change: string }
  ) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">{copy.title}</div>
          <label className={`admin-button-secondary cursor-pointer ${uploading === type ? "pointer-events-none opacity-60" : ""}`}>
            <ImagePlus className="mr-2 h-4 w-4" />
            {uploading === type ? "Uploading..." : hasValue ? copy.change : copy.upload}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadAsset(type, event)} />
          </label>
        </div>
        <div className="mt-4">{preview}</div>
      </div>
    );
  }

  const sectionMap: Record<Exclude<ContentFocus, "all">, ReactNode> = {
    brands: (
      <form className={panelClass("brands")} onSubmit={submitBrand}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="admin-pill">Brands</div>
            <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">Brand master</h2>
            <p className="mt-2 text-sm text-slate-500">Create and edit manufacturer records used across products and storefront filters.</p>
          </div>
          {selectedBrand ? (
            <button type="button" className="admin-button-secondary" onClick={resetBrand}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New
            </button>
          ) : null}
        </div>

        <input className="admin-input" placeholder="Brand name" value={brandForm.name} onChange={(event) => setBrandForm((current) => ({ ...current, name: event.target.value }))} />

        {mediaUploadCard(
          "brand",
          brandForm.logoUrl ? (
            <img src={brandForm.logoUrl} alt="Brand logo preview" className="h-16 rounded-2xl bg-white p-2 object-contain" />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">Upload a logo to preview the brand badge.</div>
          ),
          Boolean(brandForm.logoUrl),
          { title: "Optional brand logo", upload: "Upload logo", change: "Change logo" }
        )}

        <button className="admin-button w-full">{selectedBrand ? "Update brand" : "Create brand"}</button>

        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand.id} className="admin-shell-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.name} className="h-11 w-11 rounded-2xl bg-white p-1 object-contain" /> : null}
                  <div className="font-semibold text-slate-900">{brand.name}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={() => {
                      setSelectedBrand(brand);
                      setBrandForm({ name: brand.name, logoUrl: brand.logoUrl ?? "" });
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={async () => {
                      try {
                        await adminApi.deleteBrand(brand.id);
                        toast.success("Brand deleted");
                        if (selectedBrand?.id === brand.id) {
                          resetBrand();
                        }
                        await refetchBrands();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, "Failed to delete brand"));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    ),
    categories: (
      <form className={panelClass("categories")} onSubmit={submitCategory}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="admin-pill">Categories</div>
            <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">Category master</h2>
            <p className="mt-2 text-sm text-slate-500">Drive top navigation, product grouping, and homepage shortcuts from clean category data.</p>
          </div>
          {selectedCategory ? (
            <button type="button" className="admin-button-secondary" onClick={resetCategory}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New
            </button>
          ) : null}
        </div>

        <input
          className="admin-input"
          placeholder="Category name"
          value={categoryForm.name}
          onChange={(event) =>
            setCategoryForm((current) => ({
              ...current,
              name: event.target.value,
              slug: selectedCategory ? current.slug : slugify(event.target.value)
            }))
          }
        />
        <input className="admin-input" placeholder="Slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} />

        {mediaUploadCard(
          "category",
          categoryForm.iconUrl ? (
            <img src={categoryForm.iconUrl} alt="Category icon preview" className="h-16 rounded-2xl bg-white p-2 object-contain" />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">Upload an icon to preview the category tile.</div>
          ),
          Boolean(categoryForm.iconUrl),
          { title: "Optional category icon", upload: "Upload icon", change: "Change icon" }
        )}

        <button className="admin-button w-full">{selectedCategory ? "Update category" : "Create category"}</button>

        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="admin-shell-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{category.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{category.slug}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={() => {
                      setSelectedCategory(category);
                      setCategoryForm({ name: category.name, slug: category.slug, iconUrl: category.iconUrl ?? "" });
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={async () => {
                      try {
                        await adminApi.deleteCategory(category.id);
                        toast.success("Category deleted");
                        if (selectedCategory?.id === category.id) {
                          resetCategory();
                        }
                        await refetchCategories();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, "Failed to delete category"));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    ),
    banners: (
      <form className={panelClass("banners")} onSubmit={submitBanner}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="admin-pill">Homepage Banners</div>
            <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">Campaign manager</h2>
            <p className="mt-2 text-sm text-slate-500">Publish the hero creatives and campaign cards the website loads first.</p>
          </div>
          {selectedBanner ? (
            <button type="button" className="admin-button-secondary" onClick={resetBanner}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New
            </button>
          ) : null}
        </div>

        <input className="admin-input" placeholder="Banner title" value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} />
        <input className="admin-input" placeholder="Subtitle" value={bannerForm.subtitle} onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))} />
        <input className="admin-input" placeholder="Target link" value={bannerForm.linkUrl} onChange={(event) => setBannerForm((current) => ({ ...current, linkUrl: event.target.value }))} />
        <input className="admin-input" placeholder="Sort order" value={bannerForm.sortOrder} onChange={(event) => setBannerForm((current) => ({ ...current, sortOrder: event.target.value }))} />

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <input type="checkbox" checked={bannerForm.active} onChange={(event) => setBannerForm((current) => ({ ...current, active: event.target.checked }))} />
          Publish this banner on the website
        </label>

        {mediaUploadCard(
          "banner",
          <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-white">
            {bannerForm.imageUrl ? (
              <img src={bannerForm.imageUrl} alt="Banner preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">Upload a banner image to preview the homepage campaign.</div>
            )}
          </div>,
          Boolean(bannerForm.imageUrl),
          { title: "Banner image", upload: "Upload image", change: "Change image" }
        )}

        <button className="admin-button w-full">{selectedBanner ? "Update banner" : "Create banner"}</button>

        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="admin-shell-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{banner.title || "Untitled banner"}</div>
                  <div className="mt-1 text-sm text-slate-500">{banner.subtitle || "No subtitle added yet"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="admin-badge-slate">Order {banner.sortOrder}</span>
                    <span className={banner.active ? "admin-badge-green" : "admin-badge-slate"}>{banner.active ? "Published" : "Draft"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={() => {
                      setSelectedBanner(banner);
                      setBannerForm({
                        title: banner.title ?? "",
                        subtitle: banner.subtitle ?? "",
                        imageUrl: banner.imageUrl,
                        linkUrl: banner.linkUrl ?? "",
                        active: banner.active,
                        sortOrder: String(banner.sortOrder)
                      });
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="admin-button-secondary !px-4 !py-2"
                    onClick={async () => {
                      try {
                        await adminApi.deleteBanner(banner.id);
                        toast.success("Banner deleted");
                        if (selectedBanner?.id === banner.id) {
                          resetBanner();
                        }
                        await refetchBanners();
                      } catch (error) {
                        toast.error(getApiErrorMessage(error, "Failed to delete banner"));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    )
  };

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">{hero.label}</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">{hero.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-500">{hero.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Brands</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{brands.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Categories</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{categories.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Banners</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{banners.length}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {orderedSections.map((section) => (
          <div key={section}>{sectionMap[section]}</div>
        ))}
      </div>
    </div>
  );
}
