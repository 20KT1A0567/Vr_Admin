import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, ListOrdered, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import type { NavigationConfig, NavigationItem, NavigationMenuLocation } from "types";

type MenuTab = NavigationMenuLocation;

const menuMeta: Record<MenuTab, { label: string; description: string }> = {
  HEADER: { label: "Header Menu", description: "Top desktop navigation links." },
  FOOTER: { label: "Footer Menu", description: "Footer navigation links and policy links." },
  MOBILE: { label: "Mobile Menu", description: "Bottom or mobile-first navigation links." }
};

function cloneConfig(config?: NavigationConfig | null): NavigationConfig {
  return {
    headerMenu: config?.headerMenu?.map((item) => ({ ...item })) ?? [],
    footerMenu: config?.footerMenu?.map((item) => ({ ...item })) ?? [],
    mobileMenu: config?.mobileMenu?.map((item) => ({ ...item })) ?? []
  };
}

function flattenConfig(config: NavigationConfig) {
  return [...config.headerMenu, ...config.footerMenu, ...config.mobileMenu]
    .map((item, index) => ({ ...item, sortOrder: item.sortOrder ?? index + 1 }));
}

export function NavigationManagerPage() {
  const navigationQuery = useQuery({ queryKey: ["admin-navigation"], queryFn: adminApi.getNavigation });
  const [activeTab, setActiveTab] = useState<MenuTab>("HEADER");
  const [draft, setDraft] = useState<NavigationConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const config = useMemo(() => draft ?? cloneConfig(navigationQuery.data), [draft, navigationQuery.data]);
  const activeItems = activeTab === "HEADER" ? config.headerMenu : activeTab === "FOOTER" ? config.footerMenu : config.mobileMenu;

  function updateItems(nextItems: NavigationItem[]) {
    setDraft((current) => {
      const base = cloneConfig(current ?? navigationQuery.data);
      if (activeTab === "HEADER") {
        base.headerMenu = nextItems;
      } else if (activeTab === "FOOTER") {
        base.footerMenu = nextItems;
      } else {
        base.mobileMenu = nextItems;
      }
      return base;
    });
  }

  function addItem() {
    updateItems([
      ...activeItems,
      {
        menuLocation: activeTab,
        label: "",
        url: "/",
        visible: true,
        sortOrder: activeItems.length + 1
      }
    ]);
  }

  function updateItem(index: number, patch: Partial<NavigationItem>) {
    updateItems(activeItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    updateItems(activeItems.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex + 1 })));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await adminApi.updateNavigation({ items: flattenConfig(config) });
      toast.success("Navigation updated");
      setDraft(null);
      await navigationQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update navigation"));
    } finally {
      setSaving(false);
    }
  }

  if (navigationQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-28" />
        <SkeletonLoader className="h-[560px]" />
      </div>
    );
  }

  if (navigationQuery.error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(navigationQuery.error, "Failed to load navigation config")}</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Website Content"
        title="Navigation Manager"
        description="Control header, footer, and mobile menus from admin. Edit link name, URL, visibility, and order without touching website code."
        variant="premium"
      />

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {(["HEADER", "FOOTER", "MOBILE"] as MenuTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                  activeTab === tab
                    ? "border-blue-200 bg-blue-50 text-[#1E63F2]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {menuMeta[tab].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={addItem} className="admin-icon-button">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Navigation"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <div>
            <div className="font-bold text-slate-900">{menuMeta[activeTab].label}</div>
            <div className="mt-1">{menuMeta[activeTab].description}</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {activeItems.map((item, index) => (
            <div key={`${activeTab}-${item.id ?? index}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <ListOrdered className="h-3.5 w-3.5" />
                  Item {index + 1}
                </div>
                <button type="button" onClick={() => removeItem(index)} className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
                  Remove
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[1.2fr_1.4fr_120px_120px]">
                <input className="admin-input" placeholder="Link name" value={item.label} onChange={(event) => updateItem(index, { label: event.target.value })} />
                <input className="admin-input" placeholder="Link URL" value={item.url} onChange={(event) => updateItem(index, { url: event.target.value })} />
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={item.visible} onChange={(event) => updateItem(index, { visible: event.target.checked })} />
                  Show
                </label>
                <input
                  type="number"
                  min="1"
                  className="admin-input"
                  placeholder="Order"
                  value={item.sortOrder ?? index + 1}
                  onChange={(event) => updateItem(index, { sortOrder: Number(event.target.value || index + 1) })}
                />
              </div>
            </div>
          ))}
          {!activeItems.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
              No links added for this menu yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
