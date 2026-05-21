import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Copy, Mail, MessageCircle, RotateCcw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { DataTable } from "components/admin/DataTable";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import type { BackInStockRequest } from "types";

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusTone(status: string) {
  if (status === "READY_TO_NOTIFY" || status === "NOTIFIED") return "success";
  return "warning";
}

function buildNotificationMessage(request: BackInStockRequest) {
  return `Hi, ${request.productTitle} is available again at VR Technologies. You can visit the website or contact our store team to reserve it.`;
}

function getWhatsappUrl(phone: string | undefined, message: string) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const normalized = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function getMailUrl(email: string, productTitle: string, message: string) {
  return `mailto:${email}?subject=${encodeURIComponent(`${productTitle} is back in stock`)}&body=${encodeURIComponent(message)}`;
}

export function BackInStockRequestsPage() {
  const { data: requests = [], refetch } = useQuery({ queryKey: ["admin-back-in-stock-requests"], queryFn: adminApi.getBackInStockRequests });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const searchMatch = `${request.productTitle} ${request.email} ${request.phone ?? ""} ${request.status}`.toLowerCase().includes(search.toLowerCase());
        const statusMatch = status === "ALL" ? true : request.status === status;
        return searchMatch && statusMatch;
      }),
    [requests, search, status]
  );

  const waitingCount = requests.filter((request) => request.status === "WAITING").length;
  const readyCount = requests.filter((request) => request.status === "READY_TO_NOTIFY").length;
  const notifiedCount = requests.filter((request) => request.status === "NOTIFIED").length;

  async function updateStatus(id: number, value: "WAITING" | "READY_TO_NOTIFY" | "NOTIFIED") {
    setUpdatingId(id);
    try {
      await adminApi.updateBackInStockRequestStatus(id, value);
      toast.success(value === "NOTIFIED" ? "Request marked notified" : "Request status updated");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update request"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteRequest(id: number) {
    if (!window.confirm("Delete this back-in-stock request?")) {
      return;
    }
    setUpdatingId(id);
    try {
      await adminApi.deleteBackInStockRequest(id);
      toast.success("Request deleted");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete request"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function notifyCustomer(request: BackInStockRequest, channel: "whatsapp" | "email") {
    const message = buildNotificationMessage(request);
    const url = channel === "whatsapp" ? getWhatsappUrl(request.phone, message) : getMailUrl(request.email, request.productTitle, message);
    if (!url) {
      toast.error("Phone number is not available for WhatsApp");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    await updateStatus(request.id, "NOTIFIED");
  }

  async function copyMessage(request: BackInStockRequest) {
    try {
      await navigator.clipboard.writeText(buildNotificationMessage(request));
      toast.success("Notification message copied");
    } catch {
      toast.error("Unable to copy message");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory Intelligence"
        title="Demand Orchestration"
        description="Monitor customer intent for out-of-stock inventory. Execute fulfillment notifications and manage the re-engagement pipeline."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Demand Signal"
            value={String(requests.length)}
            meta="Total active requests"
            icon={<BellRing className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Awaiting Stock"
            value={String(waitingCount)}
            meta="Out-of-stock watchlist"
            icon={<RotateCcw className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Restock Ready"
            value={String(readyCount)}
            meta="Fulfillment potential"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Notified"
            value={String(notifiedCount)}
            meta="Successful re-engagement"
            icon={<Mail className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-10 py-6 dark:border-white/5 dark:bg-white/2">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-[1.25rem] border-none bg-white py-4 pl-14 pr-6 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
              placeholder="Filter via product identity, customer node, or status…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-14 min-w-[200px] rounded-[1.25rem] border-none bg-white px-6 text-xs font-black uppercase tracking-[0.1em] text-slate-900 focus:ring-4 focus:ring-slate-900/5 dark:bg-white/5 dark:text-white"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="WAITING">Awaiting Protocol</option>
            <option value="READY_TO_NOTIFY">Ready for Dispatch</option>
            <option value="NOTIFIED">Notification Broadcasted</option>
          </select>
        </div>
        <DataTable<BackInStockRequest>
          data={filteredRequests}
          rowKey={(request) => request.id}
          emptyState="No back-in-stock requests match the current filters."
          columns={[
            {
              key: "product",
              header: "Product",
              render: (request) => (
                <div>
                  <div className="font-semibold text-slate-900">{request.productTitle}</div>
                  <div className="text-xs text-slate-400">Product #{request.productId}</div>
                </div>
              )
            },
            {
              key: "customer",
              header: "Customer",
              render: (request) => (
                <div>
                  <div className="font-semibold text-slate-800">{request.email}</div>
                  <div className="text-xs text-slate-400">{request.phone || "Phone not provided"}</div>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              render: (request) => <StatusBadge tone={statusTone(request.status)}>{request.status.replace(/_/g, " ")}</StatusBadge>
            },
            {
              key: "created",
              header: "Requested",
              render: (request) => <span className="text-sm text-slate-500">{formatDateTime(request.createdAt)}</span>
            },
            {
              key: "actions",
              header: "Actions",
              render: (request) => {
                const disabled = updatingId === request.id;
                return (
                  <div className="flex flex-wrap gap-2">
                    {request.status !== "NOTIFIED" ? (
                      <>
                        {request.phone ? (
                          <button
                            type="button"
                            disabled={disabled}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60"
                            onClick={() => void notifyCustomer(request, "whatsapp")}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={disabled}
                          className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60"
                          onClick={() => void notifyCustomer(request, "email")}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={disabled}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
                      onClick={() => void copyMessage(request)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    {request.status !== "NOTIFIED" ? (
                      <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60"
                        onClick={() => updateStatus(request.id, "NOTIFIED")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Notified
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-60"
                        onClick={() => updateStatus(request.id, "WAITING")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reopen
                      </button>
                    )}
                    {request.status === "WAITING" ? (
                      <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60"
                        onClick={() => updateStatus(request.id, "READY_TO_NOTIFY")}
                      >
                        Ready
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={disabled}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-60"
                      onClick={() => deleteRequest(request.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                );
              }
            }
          ]}
        />
      </section>
    </div>
  );
}
