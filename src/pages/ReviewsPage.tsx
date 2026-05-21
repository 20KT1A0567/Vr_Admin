import { FormEvent, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, MessageSquareText, Package, PencilLine, Plus, Search, ShieldAlert, Star, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { cn } from "utils/cn";
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
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

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
  const selectedProduct = products.find((product) => String(product.id) === form.productId) ?? null;
  const productPickerResults = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products
      .filter((product) => {
        if (!query) return true;
        return `${product.title} ${product.sku ?? ""} ${product.brandName ?? ""}`.toLowerCase().includes(query);
      })
      .slice(0, 30);
  }, [productSearch, products]);

  function resetForm() {
    setSelected(null);
    setForm(emptyForm);
    setProductSearch("");
    setProductPickerOpen(false);
  }

  function startEdit(review: ProductReview) {
    setSelected(review);
    setForm(toForm(review));
    setProductSearch("");
    setProductPickerOpen(false);
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commerce"
        title="Review Moderation"
        description="Approve, reject, flag, feature, create, and edit product reviews from one real backend-powered desk."
        variant="premium"
        actions={
          <button 
            onClick={resetForm}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            New Review
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending Audit"
            value={String(counts.pending)}
            meta="Awaiting moderation"
            icon={<ShieldAlert className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Approved"
            value={String(counts.approved)}
            meta="Live on storefront"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Flagged"
            value={String(counts.flagged)}
            meta="Security incidents"
            icon={<ShieldAlert className="h-6 w-6" />}
            variant="glass"
            trend={counts.flagged > 0 ? "down" : "up"}
          />
          <StatCard
            label="Featured"
            value={String(counts.featured)}
            meta="High impact reviews"
            icon={<Star className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-6">
          <div className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="grid gap-4 lg:grid-cols-[1fr_240px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="admin-input !bg-slate-50 pl-11 dark:!bg-white/5" placeholder="Filter by customer or content..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className="admin-select !bg-slate-50 border-none shadow-none dark:!bg-white/5" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="ALL">All Moderation Statuses</option>
                <option value="PENDING">Pending Audit</option>
                <option value="APPROVED">Public: Approved</option>
                <option value="FLAGGED">Escalated: Flagged</option>
                <option value="REJECTED">Hidden: Rejected</option>
              </select>
              <div className="flex items-center rounded-2xl bg-slate-950 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {filtered.length} Entries
              </div>
            </div>
          </div>

          {!filtered.length ? (
            <EmptyState
              icon={<MessageSquareText className="h-7 w-7" />}
              title="No reviews match the filters"
              description="Create a review or clear filters to see moderation records."
            />
          ) : (
            <div className="grid gap-6">
              {filtered.map((review) => (
                <article key={review.id} className="admin-card-elevated group overflow-hidden border-none bg-white p-8 shadow-xl transition-all hover:shadow-2xl dark:bg-slate-900">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className={cn(statusClass(review.status), "text-[10px] font-black uppercase tracking-widest")}>{review.status}</span>
                        {review.featured ? <span className="admin-badge-sky text-[10px] font-black uppercase tracking-widest">Featured</span> : null}
                        <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 dark:bg-white/5">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className={cn("h-3.5 w-3.5", index < review.rating ? "fill-current text-amber-400" : "text-slate-200 dark:text-slate-700")} />
                          ))}
                        </div>
                      </div>
                      <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900 dark:text-white">{review.title || "Untitled Intelligence"}</h2>
                      <p className="mt-3 text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400">{review.comment}</p>
                      
                      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                          {review.customerName}
                        </div>
                        {review.customerEmail && <div className="text-slate-300 dark:text-slate-600">{review.customerEmail}</div>}
                        <div className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="text-slate-900 dark:text-slate-200">{review.productTitle ?? "General Insight"}</div>
                        <div className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div>{formatDate(review.updatedAt)}</div>
                      </div>
                      
                      {review.adminNote && (
                        <div className="mt-6 rounded-2xl bg-amber-50/50 p-4 border border-amber-100/50 dark:bg-amber-500/5 dark:border-amber-500/10">
                          <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">Admin Protocol Note</div>
                          <p className="mt-2 text-sm font-medium text-amber-900/70 dark:text-amber-200/50">{review.adminNote}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10" onClick={() => updateStatus(review, "APPROVED")}>
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-all hover:bg-rose-600 hover:text-white dark:bg-rose-500/10" onClick={() => updateStatus(review, "REJECTED")}>
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-all hover:bg-sky-600 hover:text-white dark:bg-sky-500/10" onClick={() => startEdit(review)}>
                        <PencilLine className="h-5 w-5" />
                      </button>
                      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white transition-all hover:bg-rose-600" onClick={() => setPendingDelete(review)}>
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="admin-card-elevated space-y-6 border-none bg-slate-900 p-8 shadow-2xl xl:sticky xl:top-24 xl:self-start dark:bg-white" onSubmit={saveReview}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 dark:bg-sky-500/10 dark:text-sky-600">
              Moderation Desk
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-white dark:text-slate-900">{selected ? "Update Record" : "New Intelligence"}</h2>
            <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">
              {selected ? "Edit customer sentiment and moderation status." : "Add a manual review record for backend processing."}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setProductPickerOpen((current) => !current)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-slate-200 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-300 dark:bg-sky-50 dark:text-sky-600">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {selectedProduct ? selectedProduct.title : "General Review"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {selectedProduct ? `${selectedProduct.brandName ?? "Product"}${selectedProduct.sku ? ` - ${selectedProduct.sku}` : ""}` : "Not linked to a product"}
                    </span>
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", productPickerOpen ? "rotate-180" : "")} />
              </button>

              {productPickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <div className="border-b border-slate-100 p-3 dark:border-slate-800">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="admin-input !h-11 !rounded-xl !bg-slate-50 pl-10 text-sm dark:!bg-slate-900"
                        placeholder="Search product name, SKU, brand..."
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((current) => ({ ...current, productId: "" }));
                        setProductPickerOpen(false);
                        setProductSearch("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900",
                        !form.productId && "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <MessageSquareText className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-black">General Review</span>
                        <span className="block text-xs text-slate-500">Use when the review is not product-specific.</span>
                      </span>
                    </button>
                    {productPickerResults.map((product: Product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, productId: String(product.id) }));
                          setProductPickerOpen(false);
                          setProductSearch("");
                        }}
                        className={cn(
                          "mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900",
                          form.productId === String(product.id) && "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                        )}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                          <Package className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">{product.title}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {product.brandName ?? "Product"}{product.sku ? ` - ${product.sku}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                    {!productPickerResults.length ? (
                      <div className="px-3 py-8 text-center text-sm font-semibold text-slate-500">No products found</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            
            <input className="admin-input !h-14 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" placeholder="Customer Name" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
            <input className="admin-input !h-14 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" placeholder="Customer Email (Optional)" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <select className="admin-select !h-14 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}>
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}
              </select>
              <select className="admin-select !h-14 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ReviewStatus }))}>
                <option value="PENDING">Pending Audit</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED">Flagged</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            
            <input className="admin-input !h-14 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" placeholder="Review Title (Optional)" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <textarea className="admin-input !min-h-32 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" placeholder="Review Comment" value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} />
            <textarea className="admin-input !min-h-24 !bg-white/5 !border-none !text-white dark:!bg-slate-50 dark:!text-slate-900" placeholder="Internal Admin Note" value={form.adminNote} onChange={(event) => setForm((current) => ({ ...current, adminNote: event.target.value }))} />
            
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl bg-white/5 p-5 transition-all hover:bg-white/10 dark:bg-slate-50 dark:hover:bg-slate-100">
              <input type="checkbox" className="h-5 w-5 rounded-lg border-none bg-sky-500/20 text-sky-500 focus:ring-sky-500/50" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
              <span className="text-sm font-bold text-white dark:text-slate-900">Feature on Storefront</span>
            </label>
          </div>
          
          <div className="flex gap-4">
            <button type="submit" className="group flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all hover:scale-105 dark:bg-slate-900 dark:text-white">
              {selected ? "Update Record" : "Deploy Review"}
            </button>
            {selected && (
              <button type="button" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white transition-all hover:bg-white/20 dark:bg-slate-100 dark:text-slate-900" onClick={resetForm}>
                <XCircle className="h-6 w-6" />
              </button>
            )}
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
