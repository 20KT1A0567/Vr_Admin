import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Box,
  Clock3,
  History,
  ImageIcon,
  IndianRupee,
  Layers,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  User as UserIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminApi } from "api/client";
import { SlideOverDrawer } from "components/admin/SlideOverDrawer";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { EmptyState } from "components/admin/EmptyState";
import type { ProductAuditEntry } from "types";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  brandId: "Brand",
  brandName: "Brand",
  categoryId: "Category",
  categoryName: "Category",
  price: "Price",
  originalPrice: "Original price",
  discountPercent: "Discount %",
  stockQuantity: "Stock",
  available: "Visibility",
  productStatus: "Status",
  productCondition: "Condition",
  sku: "SKU",
  featured: "Featured",
  bestSeller: "Best seller",
  todayDeal: "Today's deal",
  imageCount: "Image count",
  storeIds: "Stores",
  addedImageUrl: "Added image",
  removedImageUrl: "Removed image"
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  price: IndianRupee,
  originalPrice: IndianRupee,
  discountPercent: IndianRupee,
  stockQuantity: PackageCheck,
  available: PackageX,
  productStatus: Sparkles,
  productCondition: Sparkles,
  categoryId: Tag,
  categoryName: Tag,
  brandId: Tag,
  brandName: Tag,
  imageCount: ImageIcon,
  addedImageUrl: ImageIcon,
  removedImageUrl: ImageIcon,
  storeIds: Layers
};

const CURRENCY_FIELDS = new Set(["price", "originalPrice"]);

export function ProductAuditDrawer({
  productId,
  productTitle,
  open,
  onClose
}: {
  productId: number | null;
  productTitle?: string;
  open: boolean;
  onClose: () => void;
}) {
  const auditQuery = useQuery({
    queryKey: ["product-audit", productId],
    queryFn: () => adminApi.getProductAudit(productId as number),
    enabled: open && productId !== null
  });

  const entries = auditQuery.data?.items ?? [];

  return (
    <SlideOverDrawer
      open={open}
      onClose={onClose}
      width="lg"
      title="Audit history"
      subtitle={productTitle ? `Every recorded change to "${productTitle}".` : "Every recorded change to this product."}
    >
      <div className="px-6 py-5">
        {auditQuery.isLoading ? (
          <SkeletonLoader lines={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="No audit entries yet"
            description="Audit entries are recorded automatically as soon as someone updates this product."
          />
        ) : (
          <ol className="relative ml-2 space-y-5 border-l border-[color:var(--color-border)] pl-6">
            {entries.map((entry) => (
              <AuditTimelineItem key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </div>
    </SlideOverDrawer>
  );
}

function AuditTimelineItem({ entry }: { entry: ProductAuditEntry }) {
  const action = (entry.action ?? "UPDATE").toUpperCase();
  const ActionIcon = action === "CREATE" ? Plus : action === "DELETE" ? Trash2 : Pencil;
  const ringClass =
    action === "CREATE"
      ? "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30"
      : action === "DELETE"
        ? "bg-rose-500/15 text-rose-600 ring-rose-500/30"
        : "bg-indigo-500/15 text-indigo-600 ring-indigo-500/30";

  const oldValues = parseJson(entry.oldValue);
  const newValues = parseJson(entry.newValue);
  const changes = collectChangeKeys(oldValues, newValues);

  return (
    <li className="relative">
      <span
        className={`absolute -left-[34px] top-1 inline-flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-[color:var(--admin-surface)] ${ringClass}`}
        aria-hidden
      >
        <ActionIcon className="h-3.5 w-3.5" />
      </span>

      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                action === "CREATE"
                  ? "bg-emerald-100 text-emerald-700"
                  : action === "DELETE"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-indigo-100 text-indigo-700"
              }`}
            >
              {action}
            </span>
            <Clock3 className="ml-2 h-3 w-3" />
            <span>{formatDateTime(entry.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[color:var(--color-text-subtle)]">
            <UserIcon className="h-3 w-3" />
            <span className="font-semibold text-[color:var(--color-text)]">{entry.adminEmail ?? "system"}</span>
            {entry.ipAddress ? <span>· {entry.ipAddress}</span> : null}
          </div>
        </div>

        {entry.description ? (
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-text)]">{entry.description}</p>
        ) : null}

        {action === "CREATE" && newValues ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(newValues).map(([key, value]) => (
              <FieldRow key={key} field={key} value={formatValue(key, value)} />
            ))}
          </div>
        ) : null}

        {action === "DELETE" && oldValues ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(oldValues).map(([key, value]) => (
              <FieldRow key={key} field={key} value={formatValue(key, value)} struck />
            ))}
          </div>
        ) : null}

        {action !== "CREATE" && action !== "DELETE" && changes.length > 0 ? (
          <div className="mt-3 space-y-2">
            {changes.map((key) => (
              <ChangeRow
                key={key}
                field={key}
                from={formatValue(key, oldValues?.[key])}
                to={formatValue(key, newValues?.[key])}
              />
            ))}
          </div>
        ) : null}

        {action !== "CREATE" && action !== "DELETE" && changes.length === 0 && entry.newValue ? (
          <div className="mt-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface)] p-3 font-mono text-xs leading-5 text-[color:var(--color-text-subtle)]">
            {entry.newValue}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ChangeRow({ field, from, to }: { field: string; from: string; to: string }) {
  const Icon = FIELD_ICONS[field] ?? Box;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface)] px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--color-text-subtle)]" />
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">{labelFor(field)}</span>
      <span className="rounded-md bg-rose-50 px-2 py-0.5 font-mono text-xs text-rose-700 line-through dark:bg-rose-500/15 dark:text-rose-300">
        {from}
      </span>
      <ArrowRight className="h-3 w-3 text-[color:var(--color-text-subtle)]" />
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        {to}
      </span>
    </div>
  );
}

function FieldRow({ field, value, struck }: { field: string; value: string; struck?: boolean }) {
  const Icon = FIELD_ICONS[field] ?? Box;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface)] px-3 py-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--color-text-subtle)]" />
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">{labelFor(field)}</span>
      <span className={`ml-auto font-mono text-xs ${struck ? "text-[color:var(--color-text-subtle)] line-through" : "text-[color:var(--color-text)]"}`}>
        {value}
      </span>
    </div>
  );
}

function labelFor(field: string) {
  return FIELD_LABELS[field] ?? field;
}

function parseJson(value?: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function collectChangeKeys(oldVals: Record<string, unknown> | null, newVals: Record<string, unknown> | null): string[] {
  const keys = new Set<string>();
  if (oldVals) Object.keys(oldVals).forEach((k) => keys.add(k));
  if (newVals) Object.keys(newVals).forEach((k) => keys.add(k));
  return Array.from(keys).sort();
}

function formatValue(field: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (CURRENCY_FIELDS.has(field) && typeof value === "number") {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  if (typeof value === "string" && value.length > 80) {
    return value.slice(0, 80) + "…";
  }
  return String(value);
}

function formatDateTime(value?: string): string {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

