import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Webhook } from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { DataTable } from "components/admin/DataTable";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatusBadge } from "components/admin/StatusBadge";

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

function statusTone(status?: string) {
  if (status === "PROCESSED") return "success" as const;
  if (status === "UNMATCHED" || status === "FAILED") return "danger" as const;
  if (status === "IGNORED") return "warning" as const;
  return "neutral" as const;
}

export function PaymentWebhookEventsPage() {
  const [search, setSearch] = useState("");
  const eventsQuery = useQuery({ queryKey: ["payment-webhook-events"], queryFn: adminApi.getPaymentWebhookEvents });
  const events = eventsQuery.data ?? [];

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) =>
      `${event.gatewayEventId ?? ""} ${event.eventType ?? ""} ${event.gatewayOrderId ?? ""} ${event.gatewayPaymentId ?? ""} ${event.status ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [events, search]);

  if (eventsQuery.isLoading) {
    return <SkeletonLoader lines={8} />;
  }

  if (eventsQuery.error) {
    return (
      <EmptyState
        icon={<Webhook className="h-6 w-6" />}
        title="Webhook events could not be loaded"
        description={getApiErrorMessage(eventsQuery.error, "Payment webhook history could not be loaded.")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Commerce" title="Payment webhook events" description="Inspect raw Razorpay webhook processing, duplicate protection, and unmatched events." />

      <section className="admin-card p-4">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="admin-input pl-11" placeholder="Search event, order, payment, status" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <DataTable
        data={filteredEvents}
        rowKey={(event) => event.id}
        emptyState="No payment webhook events found."
        columns={[
          {
            key: "event",
            header: "Event",
            render: (event) => (
              <div>
                <div className="font-semibold text-slate-900">{event.eventType ?? "Unknown event"}</div>
                <div className="text-xs text-slate-500">{event.gatewayEventId ?? "-"}</div>
              </div>
            )
          },
          { key: "status", header: "Status", render: (event) => <StatusBadge tone={statusTone(event.status)}>{event.status ?? "RECEIVED"}</StatusBadge> },
          {
            key: "payment",
            header: "Gateway refs",
            render: (event) => (
              <div className="text-xs text-slate-600">
                <div>Order: {event.gatewayOrderId ?? "-"}</div>
                <div>Payment: {event.gatewayPaymentId ?? "-"}</div>
              </div>
            )
          },
          { key: "error", header: "Error", render: (event) => <span className="line-clamp-2 text-sm text-slate-600">{event.errorMessage ?? "-"}</span> },
          { key: "processed", header: "Processed", render: (event) => formatDate(event.processedAt ?? event.createdAt) }
        ]}
      />
    </div>
  );
}
