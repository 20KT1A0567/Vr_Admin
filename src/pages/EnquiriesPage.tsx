import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareMore, Phone, Search } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { FilterBar } from "components/admin/FilterBar";
import { PageHeader } from "components/admin/PageHeader";
import { SearchInput } from "components/admin/SearchInput";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import { Tabs } from "components/admin/Tabs";

const enquiryStatuses = ["ALL", "NEW", "FOLLOW_UP", "RESOLVED"] as const;

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toneForStatus(status: string) {
  if (status === "NEW") {
    return "info";
  }
  if (status === "FOLLOW_UP") {
    return "warning";
  }
  if (status === "RESOLVED") {
    return "success";
  }
  return "neutral";
}

export function EnquiriesPage() {
  const { data: enquiries = [], refetch } = useQuery({ queryKey: ["admin-enquiries"], queryFn: adminApi.getEnquiries });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof enquiryStatuses)[number]>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enquiry) => {
      const searchMatch = `${enquiry.name} ${enquiry.phone} ${enquiry.email ?? ""} ${enquiry.message ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : enquiry.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [enquiries, search, statusFilter]);

  useEffect(() => {
    if (!filteredEnquiries.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredEnquiries.some((enquiry) => enquiry.id === selectedId)) {
      setSelectedId(filteredEnquiries[0].id);
    }
  }, [filteredEnquiries, selectedId]);

  const selectedEnquiry = filteredEnquiries.find((enquiry) => enquiry.id === selectedId) ?? null;
  const newCount = enquiries.filter((enquiry) => enquiry.status === "NEW").length;
  const followUpCount = enquiries.filter((enquiry) => enquiry.status === "FOLLOW_UP").length;
  const resolvedCount = enquiries.filter((enquiry) => enquiry.status === "RESOLVED").length;

  async function updateStatus(id: number, value: string) {
    try {
      await adminApi.updateEnquiryStatus(id, value);
      toast.success("Enquiry updated");
      await refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update enquiry"));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Commerce"
        title="Enquiries inbox"
        description="Treat inbound leads and support messages like a proper CRM inbox instead of buried admin noise."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Enquiries"
            value={String(enquiries.length)}
            meta={`${filteredEnquiries.length} in view`}
            icon={<MessageSquareMore className="h-5 w-5" />}
            accentClassName="bg-blue-50 text-blue-700"
            trend="flat"
          />
          <StatCard
            label="New"
            value={String(newCount)}
            meta="Awaiting first response"
            icon={<Search className="h-5 w-5" />}
            accentClassName="bg-cyan-50 text-cyan-700"
            trend={newCount > 0 ? "up" : "flat"}
          />
          <StatCard
            label="Follow Up"
            value={String(followUpCount)}
            meta="Needs next touchpoint"
            icon={<Phone className="h-5 w-5" />}
            accentClassName="bg-amber-50 text-amber-700"
            trend={followUpCount > 0 ? "down" : "flat"}
          />
          <StatCard
            label="Resolved"
            value={String(resolvedCount)}
            meta="Closed conversations"
            icon={<MessageSquareMore className="h-5 w-5" />}
            accentClassName="bg-emerald-50 text-emerald-700"
            trend="up"
          />
        </div>
      </PageHeader>

      <FilterBar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            items={enquiryStatuses.map((status) => ({
              value: status,
              label: status === "ALL" ? "All" : formatStatus(status),
              badge: status === "ALL" ? enquiries.length : enquiries.filter((enquiry) => enquiry.status === status).length
            }))}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
            {filteredEnquiries.length} conversations
          </div>
        </div>
        <SearchInput
          containerClassName="max-w-[420px]"
          placeholder="Search customer, phone, email, or message"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </FilterBar>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="admin-shell overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-950">Conversation list</h2>
            <p className="mt-1 text-sm text-slate-500">Select a customer to inspect the full message thread context.</p>
          </div>
          <div className="admin-scrollbar max-h-[calc(100vh-20rem)] overflow-y-auto p-3">
            <div className="space-y-2">
              {filteredEnquiries.map((enquiry) => {
                const selected = enquiry.id === selectedEnquiry?.id;
                return (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() => setSelectedId(enquiry.id)}
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                      selected
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">{enquiry.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{enquiry.phone}</div>
                      </div>
                      <StatusBadge tone={toneForStatus(enquiry.status)}>{formatStatus(enquiry.status)}</StatusBadge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{enquiry.message ?? "No message attached."}</p>
                  </button>
                );
              })}
              {!filteredEnquiries.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">No enquiries match this view.</div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-shell overflow-hidden">
          {selectedEnquiry ? (
            <>
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-950">{selectedEnquiry.name}</h2>
                      <StatusBadge tone={toneForStatus(selectedEnquiry.status)}>{formatStatus(selectedEnquiry.status)}</StatusBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>{selectedEnquiry.phone}</span>
                      {selectedEnquiry.email ? <span>{selectedEnquiry.email}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold"
                      href={`tel:${selectedEnquiry.phone}`}
                    >
                      Call
                    </a>
                    <a
                      className="admin-button inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold"
                      href={`https://wa.me/${selectedEnquiry.phone.replace(/\D/g, "")}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                  <div className="admin-shell-muted p-5">
                    <div className="admin-section-label">Message</div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{selectedEnquiry.message ?? "No message shared by the customer."}</p>
                  </div>
                  <div className="admin-shell-muted p-5">
                    <div className="admin-section-label">Suggested next action</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      <li>Reach out on phone or WhatsApp using the contact actions above.</li>
                      <li>Move the enquiry to follow up once first contact is made.</li>
                      <li>Mark it resolved after the customer request is closed.</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="admin-shell-muted p-5">
                    <div className="admin-section-label">Status update</div>
                    <div className="mt-4 grid gap-3">
                      {["NEW", "FOLLOW_UP", "RESOLVED"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void updateStatus(selectedEnquiry.id, status)}
                          className={`rounded-[20px] border px-4 py-3 text-left text-sm font-medium transition ${
                            selectedEnquiry.status === status
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {formatStatus(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="admin-shell-muted p-5">
                    <div className="admin-section-label">Contact snapshot</div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Phone</div>
                        <div className="mt-1">{selectedEnquiry.phone}</div>
                      </div>
                      {selectedEnquiry.email ? (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</div>
                          <div className="mt-1">{selectedEnquiry.email}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[360px] place-items-center px-6 py-12 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <MessageSquareMore className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900">Select an enquiry</div>
                <p className="mt-2 text-sm text-slate-500">Choose a conversation from the list to inspect the message and take action.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
