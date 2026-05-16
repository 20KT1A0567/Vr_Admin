import { FormEvent, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText, PencilLine, Plus, Search, ShieldAlert, Star, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import type { Product, ProductReview, ProductReviewPayload, ReviewStatus } from "types";

type ReviewForm = {
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: string;
  title: string;
  comment: string;
  status: ReviewStatus;
  featured: boolean;
  adminNote: string;
};

const emptyForm: ReviewForm = {
  productId: "",
  customerName: "",
  customerEmail: "",
  rating: "5",
  title: "",
  comment: "",
  status: "PENDING",
  featured: false,
  adminNote: ""
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function statusClass(status: ReviewStatus) {
  if (status === "APPROVED") return "admin-badge-green";
  if (status === "REJECTED") return "admin-badge-rose";
  if (status === "FLAGGED") return "admin-badge-amber";
  return "admin-badge-slate";
}

function toForm(review: ProductReview): ReviewForm {
  return {
    productId: review.productId ? String(review.productId) : "",
    customerName: review.customerName,
    customerEmail: review.customerEmail ?? "",
    rating: String(review.rating),
    title: review.title ?? "",
    comment: review.comment,
    status: review.status,
    featured: review.featured,
    adminNote: review.adminNote ?? ""
  };
}

function toPayload(form: ReviewForm): ProductReviewPayload {
  return {
    productId: form.productId ? Number(form.productId) : null,
    customerName: form.customerName.trim(),
    customerEmail: form.customerEmail.trim() || null,
    rating: Number(form.rating || 5),
    title: form.title.trim() || null,
    comment: form.comment.trim(),
    status: form.status,
    featured: form.featured,
    adminNote: form.adminNote.trim() || null
  };
}

export function ReviewsPage() {
  const reviewsQuery = useQuery({ queryKey: ["admin-reviews"], queryFn: adminApi.getReviews });
  const productsQuery = useQuery({ queryKey: ["admin-products-review-picker"], queryFn: () => adminApi.getProducts() });
  const reviews = reviewsQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReviewStatus>("ALL");
  const [selected, setSelected] = useState<ProductReview | null>(null);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<ProductReview | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const statusMatch = statusFilter === "ALL" || review.status === statusFilter;
      const text = `${review.customerName} ${review.customerEmail ?? ""} ${review.productTitle ?? ""} ${review.title ?? ""} ${review.comment}`.toLowerCase();
      return statusMatch && (!query || text.includes(query));
    });
  }, [reviews, search, statusFilter]);

  const counts = {
    pending: reviews.filter((review) => review.status === "PENDING").length,
    approved: reviews.filter((review) => review.status === "APPROVED").length,
    flagged: reviews.filter((review) => review.status === "FLAGGED").length,
    featured: reviews.filter((review) => review.featured).length
  };

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
  }

  function startEdit(review: ProductReview) {
    setSelected(review);
    setForm(toForm(review));
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.comment.trim()) {
      toast.error("Review comment is required");
      return;
    }
    const rating = Number(form.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      toast.error("Rating must be between 1 and 5");
      return;
    }

    try {
      if (selected) {
        await adminApi.updateReview(selected.id, toPayload(form));
        toast.success("Review updated");
      } else {
        await adminApi.createReview(toPayload(form));
        toast.success("Review created");
      }
      resetForm();
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, selected ? "Failed to update review" : "Failed to create review"));
    }
  }

  async function updateStatus(review: ProductReview, status: ReviewStatus) {
    try {
      await adminApi.updateReviewStatus(review.id, status);
      toast.success(`Review ${status.toLowerCase()}`);
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update review status"));
    }
  }

  async function toggleFeatured(review: ProductReview) {
    try {
      await adminApi.toggleReviewFeatured(review.id);
      toast.success(review.featured ? "Review removed from featured" : "Review featured");
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update featured review"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await adminApi.deleteReview(pendingDelete.id);
      toast.success("Review deleted");
      if (selected?.id === pendingDelete.id) resetForm();
      await reviewsQuery.refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete review"));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-shell p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Commerce</div>
            <h1 className="admin-display mt-3 text-3xl font-semibold text-slate-950">Review moderation</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Approve, reject, flag, feature, create, and edit product reviews from one real backend-powered desk.
            </p>
          </div>
          <button type="button" className="admin-button" onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            New review
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <ReviewMetric label="Pending" value={counts.pending} icon={<ShieldAlert className="h-5 w-5" />} tone="text-amber-600 bg-amber-50" />
          <ReviewMetric label="Approved" value={counts.approved} icon={<CheckCircle2 className="h-5 w-5" />} tone="text-emerald-600 bg-emerald-50" />
          <ReviewMetric label="Flagged" value={counts.flagged} icon={<ShieldAlert className="h-5 w-5" />} tone="text-rose-600 bg-rose-50" />
          <ReviewMetric label="Featured" value={counts.featured} icon={<Star className="h-5 w-5" />} tone="text-blue-600 bg-blue-50" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-4">
          <div className="admin-shell p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="admin-input pl-11" placeholder="Search customer, product, or review text" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED">Flagged</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">{filtered.length} shown</div>
            </div>
          </div>

          {!filtered.length ? (
            <EmptyState
              icon={<MessageSquareText className="h-7 w-7" />}
              title="No reviews match the filters"
              description="Create a review or clear filters to see moderation records."
            />
          ) : (
            <div className="grid gap-4">
              {filtered.map((review) => (
                <article key={review.id} className="admin-card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={statusClass(review.status)}>{review.status}</span>
                        {review.featured ? <span className="admin-badge-sky">Featured</span> : null}
                        <span className="admin-chip">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current text-amber-500" : "text-slate-300"}`} />
                          ))}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-black text-slate-950">{review.title || "Untitled review"}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                        <span>{review.customerName}</span>
                        {review.customerEmail ? <span>{review.customerEmail}</span> : null}
                        <span>{review.productTitle ?? "General review"}</span>
                        <span>{formatDate(review.updatedAt)}</span>
                      </div>
                      {review.adminNote ? <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Note: {review.adminNote}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="admin-icon-button" onClick={() => updateStatus(review, "APPROVED")} aria-label="Approve">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button type="button" className="admin-icon-button" onClick={() => updateStatus(review, "REJECTED")} aria-label="Reject">
                        <XCircle className="h-4 w-4" />
                      </button>
                      <button type="button" className="admin-icon-button" onClick={() => toggleFeatured(review)} aria-label="Toggle featured">
                        <Star className={`h-4 w-4 ${review.featured ? "fill-current text-blue-600" : ""}`} />
                      </button>
                      <button type="button" className="admin-icon-button" onClick={() => startEdit(review)} aria-label="Edit">
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button type="button" className="admin-icon-button-danger" onClick={() => setPendingDelete(review)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="admin-shell space-y-4 p-5 xl:sticky xl:top-24 xl:self-start" onSubmit={saveReview}>
          <div>
            <div className="admin-pill">{selected ? "Edit review" : "Create review"}</div>
            <h2 className="admin-display mt-3 text-xl font-semibold text-slate-950">{selected ? "Update customer review" : "Add review"}</h2>
          </div>
          <select className="admin-select" value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>
            <option value="">General review</option>
            {products.map((product: Product) => (
              <option key={product.id} value={product.id}>{product.title}</option>
            ))}
          </select>
          <input className="admin-input" placeholder="Customer name" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
          <input className="admin-input" placeholder="Customer email optional" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="admin-select" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
            </select>
            <select className="admin-select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ReviewStatus }))}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="FLAGGED">Flagged</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <input className="admin-input" placeholder="Review title optional" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <textarea className="admin-input min-h-32" placeholder="Review comment" value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} />
          <textarea className="admin-input min-h-24" placeholder="Internal admin note optional" value={form.adminNote} onChange={(event) => setForm((current) => ({ ...current, adminNote: event.target.value }))} />
          <label className="admin-check-card cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
            Feature this review on the storefront
          </label>
          <div className="flex gap-3">
            <button type="submit" className="admin-button flex-1">{selected ? "Update review" : "Create review"}</button>
            {selected ? <button type="button" className="admin-button-secondary" onClick={resetForm}>Cancel</button> : null}
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete review?"
        description="This removes the review and its moderation state from the backend."
        confirmLabel="Delete review"
        tone="danger"
      />
    </div>
  );
}

function ReviewMetric({ icon, label, tone, value }: { icon: ReactNode; label: string; tone: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>{icon}</span>
      </div>
    </div>
  );
}
