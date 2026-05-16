import { useState } from "react";
import { Button, Collapse, IconButton, Paper, Tooltip } from "@mui/material";
import { Building2, PackagePlus, Plus, RefreshCcw, Sparkles, Tags, X } from "lucide-react";
import { ActionButton } from "components/admin/ActionButton";

interface CatalogCreateBarProps {
  brandLogoUrl: string;
  brandName: string;
  creatingBrand?: boolean;
  featuredCount: number;
  lowStockCount: number;
  onBrandLogoUrlChange: (value: string) => void;
  onBrandNameChange: (value: string) => void;
  onCreateBrand: () => void;
  onCreateProduct: () => void;
  onRefresh: () => void;
  productCount: number;
  visibleCount: number;
}

export function CatalogCreateBar({
  brandLogoUrl,
  brandName,
  creatingBrand,
  featuredCount,
  lowStockCount,
  onBrandLogoUrlChange,
  onBrandNameChange,
  onCreateBrand,
  onCreateProduct,
  onRefresh,
  productCount,
  visibleCount
}: CatalogCreateBarProps) {
  const [brandOpen, setBrandOpen] = useState(false);

  return (
    <Paper component="section" elevation={0} className="admin-shell overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="admin-pill">Catalog Control</div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Products workspace</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Create products, manage inventory, and keep catalog actions in one clean workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ActionButton variant="secondary" icon={<RefreshCcw className="h-4 w-4" />} onClick={onRefresh}>
              Refresh
            </ActionButton>
            <Button
              disableElevation
              variant="outlined"
              startIcon={<Tags className="h-4 w-4" />}
              className="!h-11 !rounded-xl !border-slate-300 !px-4 !font-bold !normal-case !text-slate-700 hover:!bg-slate-50"
              onClick={() => setBrandOpen((current) => !current)}
            >
              Quick brand
            </Button>
            <ActionButton icon={<PackagePlus className="h-4 w-4" />} onClick={onCreateProduct}>
              Create product
            </ActionButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {[
            { label: "Products", value: productCount, icon: PackagePlus },
            { label: "Visible", value: visibleCount, icon: Building2 },
            { label: "Featured", value: featuredCount, icon: Sparkles },
            { label: "Low stock", value: lowStockCount, icon: Tags }
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="admin-section-label">{item.label}</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-950">{item.value}</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
            </article>
          ))}
        </div>

        <Collapse in={brandOpen} timeout={220} unmountOnExit>
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-950">Quick brand creation</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">Use this only when the product brand is missing from the brand library.</p>
              </div>
              <Tooltip title="Close">
                <IconButton className="!h-9 !w-9 !text-slate-500" onClick={() => setBrandOpen(false)}>
                  <X className="h-4 w-4" />
                </IconButton>
              </Tooltip>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <input className="admin-input" placeholder="Brand name" value={brandName} onChange={(event) => onBrandNameChange(event.target.value)} />
              <input className="admin-input" placeholder="Logo URL optional" value={brandLogoUrl} onChange={(event) => onBrandLogoUrlChange(event.target.value)} />
              <Button
                disableElevation
                variant="contained"
                startIcon={<Plus className="h-4 w-4" />}
                className="!h-11 !rounded-xl !bg-[#1E63F2] !px-6 !font-bold !normal-case hover:!bg-[#154ED1]"
                disabled={creatingBrand}
                onClick={onCreateBrand}
              >
                Create brand
              </Button>
            </div>
          </div>
        </Collapse>
      </div>
    </Paper>
  );
}
