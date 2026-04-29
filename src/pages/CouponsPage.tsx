import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PencilLine, RotateCcw, TicketPercent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";
import type { Coupon, CouponStatus } from "types";

const emptyForm = {
  code: "",
  discount: "",
  minOrder: "",
  expiryDate: "",
  usageLimit: "",
  status: "ACTIVE" as CouponStatus
};

function formatCurrency(value: number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

function formatStatus(status: CouponStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function CouponsPage() {
  const { data: coupons = [], refetch } = useQuery({ queryKey: ["admin-coupons"], queryFn: adminApi.getCoupons });
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId]
  );
  const activeCoupons = useMemo(() => coupons.filter((coupon) => coupon.status === "ACTIVE").length, [coupons]);

  useEffect(() => {
    if (!selectedCoupon) {
      setForm(emptyForm);
      return;
    }

    setForm({
      code: selectedCoupon.code,
      discount: String(selectedCoupon.discount ?? ""),
      minOrder: String(selectedCoupon.minOrder ?? ""),
      expiryDate: selectedCoupon.expiryDate ?? "",
      usageLimit: String(selectedCoupon.usageLimit ?? ""),
      status: selectedCoupon.status
    });
  }, [selectedCoupon]);

  function resetForm() {
    setSelectedCouponId(null);
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

      resetForm();
      await refetch();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Failed to save coupon";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(coupon: Coupon) {
    try {
      await adminApi.deleteCoupon(coupon.id);
      toast.success("Coupon deleted");
      if (selectedCouponId === coupon.id) {
        resetForm();
      }
      await refetch();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Failed to delete coupon";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Coupons</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">Promotions, minimum order thresholds, and campaign expiry in one screen.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              Coupons are now stored by the backend instead of living only in local page state.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total coupons</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{coupons.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active campaigns</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{activeCoupons}</div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <form className="admin-shell space-y-4 p-6" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="admin-pill">{selectedCoupon ? "Edit Coupon" : "Add New Coupon"}</div>
              <h2 className="admin-display mt-4 text-2xl font-semibold text-slate-950">Create a campaign code</h2>
            </div>
            {selectedCoupon ? (
              <button type="button" className="admin-button-secondary" onClick={resetForm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New
              </button>
            ) : null}
          </div>

          <input className="admin-input" placeholder="Coupon code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          <input className="admin-input" placeholder="Discount amount or percent" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} />
          <input className="admin-input" placeholder="Minimum order value" value={form.minOrder} onChange={(event) => setForm((current) => ({ ...current, minOrder: event.target.value }))} />
          <input className="admin-input" type="date" value={form.expiryDate} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} />
          <input className="admin-input" placeholder="Usage limit" value={form.usageLimit} onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} />
          <select className="admin-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CouponStatus }))}>
            <option value="ACTIVE">Active</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <button className="admin-button w-full" type="submit" disabled={saving}>
            <TicketPercent className="mr-2 h-4 w-4" />
            {selectedCoupon ? "Update coupon" : "Save coupon"}
          </button>
        </form>

        <section className="admin-shell p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="admin-display text-2xl font-semibold text-slate-950">Coupon list</h2>
              <p className="mt-1 text-sm text-slate-500">Manage the persisted coupon records from the admin API.</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Code</th>
                  <th className="pb-3 pr-4 font-medium">Discount</th>
                  <th className="pb-3 pr-4 font-medium">Min order</th>
                  <th className="pb-3 pr-4 font-medium">Expiry date</th>
                  <th className="pb-3 pr-4 font-medium">Usage limit</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-medium text-slate-900">{coupon.code}</td>
                    <td className="py-4 pr-4 text-slate-600">{coupon.discount}</td>
                    <td className="py-4 pr-4 text-slate-600">{formatCurrency(coupon.minOrder)}</td>
                    <td className="py-4 pr-4 text-slate-600">{coupon.expiryDate || "Not set"}</td>
                    <td className="py-4 pr-4 text-slate-600">{coupon.usageLimit}</td>
                    <td className="py-4 pr-4">
                      <span className={coupon.status === "ACTIVE" ? "admin-badge-green" : coupon.status === "SCHEDULED" ? "admin-badge-amber" : "admin-badge-slate"}>
                        {formatStatus(coupon.status)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="admin-button-secondary !px-4 !py-2"
                          onClick={() => setSelectedCouponId(coupon.id)}
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-button-secondary !px-4 !py-2"
                          onClick={async () => handleDelete(coupon)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!coupons.length ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No coupons created yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
