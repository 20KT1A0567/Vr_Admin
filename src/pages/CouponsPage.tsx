import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock3, PencilLine, Plus, TicketPercent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { DataTable } from "components/admin/DataTable";
import { FilterBar } from "components/admin/FilterBar";
import { FormField } from "components/admin/FormField";
import { FormSection } from "components/admin/FormSection";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { SlideOverDrawer } from "components/admin/SlideOverDrawer";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import type { Coupon, CouponStatus } from "types";

type CouponFilterStatus = "ALL" | CouponStatus;
type CouponFormState = {
  code: string;
  discount: string;
  minOrder: string;
  expiryDate: string;
  usageLimit: string;
  status: CouponStatus;
};

const emptyForm: CouponFormState = {
  code: "",
  discount: "",
  minOrder: "",
  expiryDate: "",
  usageLimit: "",
  status: "ACTIVE"
};

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function formatStatus(status: CouponStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value?: string) {
  if (!value) {
    return "No expiry";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusTone(status: CouponStatus) {
  if (status === "ACTIVE") {
    return "success";
  }
  if (status === "SCHEDULED") {
    return "warning";
  }
  return "neutral";
}

function toFormState(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    discount: String(coupon.discount ?? ""),
    minOrder: String(coupon.minOrder ?? ""),
    expiryDate: coupon.expiryDate ?? "",
    usageLimit: String(coupon.usageLimit ?? ""),
    status: coupon.status
  };
}

export function CouponsPage() {
  const { data: coupons = [], isLoading, refetch } = useQuery({ queryKey: ["admin-coupons"], queryFn: adminApi.getCoupons });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CouponFilterStatus>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === editingId) ?? null,
    [coupons, editingId]
  );

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const searchMatch = `${coupon.code} ${coupon.status} ${coupon.discount} ${coupon.minOrder}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : coupon.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [coupons, search, statusFilter]);

  const activeCount = coupons.filter((coupon) => coupon.status === "ACTIVE").length;
  const scheduledCount = coupons.filter((coupon) => coupon.status === "SCHEDULED").length;
  const expiredCount = coupons.filter((coupon) => coupon.status === "EXPIRED").length;
  const usageCapacity = coupons.reduce((sum, coupon) => sum + Number(coupon.usageLimit ?? 0), 0);

  function openCreateDrawer() {
    setEditingId(null);
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEditDrawer(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm(toFormState(coupon));
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.code.trim()) {
      toast.error("Enter a coupon code");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount: Number(form.discount || 0),
        minOrder: Number(form.minOrder || 0),
        expiryDate: form.expiryDate || undefined,
        usageLimit: Number(form.usageLimit || 0),
        status: form.status
      };

      if (selectedCoupon) {
        await adminApi.updateCoupon(selectedCoupon.id, payload);
        toast.success("Coupon updated");
      } else {
        await adminApi.createCoupon(payload);
        toast.success("Coupon created");
      }

      closeDrawer();
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selectedCoupon ? "Failed to update coupon" : "Failed to create coupon"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      await adminApi.deleteCoupon(deleteTarget.id);
      toast.success("Coupon deleted");
      if (editingId === deleteTarget.id) {
        closeDrawer();
      }
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete coupon"));
    }
  }

  if (isLoading && !coupons.length) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Commerce"
          title="Coupon campaigns"
          description="Loading discount rules, campaign statuses, and promotion settings."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="admin-shell p-5">
              <SkeletonLoader lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commerce"
        title="Coupon Campaigns"
        description="Manage live discounts, expiry windows, and usage controls with a cleaner campaign-first workspace."
        variant="premium"
        actions={
          <button 
            onClick={openCreateDrawer}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            Launch Campaign
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Coupons"
            value={String(coupons.length)}
            meta={`${filteredCoupons.length} matching filters`}
            icon={<TicketPercent className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Active Offers"
            value={String(activeCount)}
            meta="Live market campaigns"
            icon={<TicketPercent className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Scheduled"
            value={String(scheduledCount)}
            meta="Queued for deployment"
            icon={<Clock3 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Exhausted"
            value={String(expiredCount)}
            meta={`${usageCapacity.toLocaleString("en-IN")} capacity used`}
            icon={<CalendarClock className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <FilterBar
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>{filteredCoupons.length} Campaigns matching active criteria</span>
            <button
              type="button"
              className="text-sky-500 hover:text-sky-600 transition-colors"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
          <SearchInput
            placeholder="Search coupon identity or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-select !bg-slate-50 border-none shadow-none dark:!bg-white/5"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as CouponFilterStatus)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Protocol</option>
            <option value="SCHEDULED">Scheduled Queue</option>
            <option value="EXPIRED">Deactivated</option>
          </select>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white">
            <TicketPercent className="h-3.5 w-3.5 text-sky-400" />
            Usage Cap: {usageCapacity.toLocaleString("en-IN")}
          </div>
        </div>
      </FilterBar>

      <DataTable
        data={filteredCoupons}
        rowKey={(coupon) => coupon.id}
        emptyState="No coupons match the current search or status filter."
        columns={[
          {
            key: "coupon",
            header: "Coupon",
            render: (coupon) => (
              <div>
                <div className="font-semibold text-slate-900">{coupon.code}</div>
                <div className="text-xs text-slate-400">Campaign #{coupon.id}</div>
              </div>
            )
          },
          {
            key: "discount",
            header: "Discount",
            render: (coupon) => <span className="font-medium text-slate-900">{coupon.discount}</span>
          },
          {
            key: "min-order",
            header: "Minimum Order",
            render: (coupon) => <span className="text-slate-600">{formatCurrency(coupon.minOrder)}</span>
          },
          {
            key: "expiry",
            header: "Expiry",
            render: (coupon) => <span className="text-slate-600">{formatDate(coupon.expiryDate)}</span>
          },
          {
            key: "usage-limit",
            header: "Usage Limit",
            render: (coupon) => <span className="text-slate-600">{Number(coupon.usageLimit ?? 0).toLocaleString("en-IN")}</span>
          },
          {
            key: "status",
            header: "Status",
            render: (coupon) => (
              <StatusBadge tone={getStatusTone(coupon.status)}>
                {formatStatus(coupon.status)}
              </StatusBadge>
            )
          },
          {
            key: "actions",
            header: "Actions",
            cellClassName: "w-[140px]",
            render: (coupon) => (
              <div className="flex items-center justify-end gap-2">
                <ActionButton
                  size="icon"
                  variant="secondary"
                  aria-label={`Edit ${coupon.code}`}
                  onClick={() => openEditDrawer(coupon)}
                >
                  <PencilLine className="h-4 w-4" />
                </ActionButton>
                <ActionButton
                  size="icon"
                  variant="danger"
                  aria-label={`Delete ${coupon.code}`}
                  onClick={() => setDeleteTarget(coupon)}
                >
                  <Trash2 className="h-4 w-4" />
                </ActionButton>
              </div>
            )
          }
        ]}
      />

      <SlideOverDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={selectedCoupon ? "Edit coupon campaign" : "Create coupon campaign"}
        subtitle="Configure discount behavior without changing any backend contracts."
        width="md"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={closeDrawer}>
              Cancel
            </ActionButton>
            <ActionButton loading={saving} icon={<TicketPercent className="h-4 w-4" />} type="submit" form="coupon-form">
              {selectedCoupon ? "Save changes" : "Create coupon"}
            </ActionButton>
          </div>
        }
      >
        <form id="coupon-form" className="space-y-5" onSubmit={handleSubmit}>
          <FormSection
            title="Campaign basics"
            description="Set the coupon identity and current campaign status."
            actions={
              selectedCoupon ? (
                <ActionButton variant="secondary" onClick={openCreateDrawer}>
                  New coupon
                </ActionButton>
              ) : null
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Coupon code" required hint="Codes are normalized to uppercase before saving.">
                <input
                  className="admin-input"
                  placeholder="WELCOME10"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                />
              </FormField>
              <FormField label="Status" required hint="Use scheduled for upcoming campaigns.">
                <select
                  className="admin-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CouponStatus }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Discount rules" description="Control order thresholds, value, and usage cap.">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Discount value" required hint="Store the raw numeric value expected by the API.">
                <input
                  className="admin-input"
                  inputMode="decimal"
                  placeholder="250"
                  value={form.discount}
                  onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))}
                />
              </FormField>
              <FormField label="Minimum order" hint="Optional lower purchase threshold.">
                <input
                  className="admin-input"
                  inputMode="decimal"
                  placeholder="1000"
                  value={form.minOrder}
                  onChange={(event) => setForm((current) => ({ ...current, minOrder: event.target.value }))}
                />
              </FormField>
              <FormField label="Usage limit" hint="Total redemptions allowed for this coupon.">
                <input
                  className="admin-input"
                  inputMode="numeric"
                  placeholder="250"
                  value={form.usageLimit}
                  onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Schedule" description="Apply an expiry date when the discount should stop working.">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <FormField label="Expiry date" hint="Leave empty to keep the campaign open ended.">
                <input
                  className="admin-input"
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                />
              </FormField>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {form.expiryDate ? `Ends on ${formatDate(form.expiryDate)}` : "No expiry date configured"}
              </div>
            </div>
          </FormSection>
        </form>
      </SlideOverDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete coupon campaign?"
        description={`This will permanently remove ${deleteTarget?.code ?? "this coupon"} from the admin panel.`}
        confirmLabel="Delete coupon"
        tone="danger"
      />
    </div>
  );
}
