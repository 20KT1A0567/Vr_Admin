import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, IndianRupee, Mail, MessageSquareMore, Phone, Search, Send, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { StatusBadge } from "components/admin/StatusBadge";
import type { Enquiry } from "types";

const enquiryStatuses = ["ALL", "NEW", "FOLLOW_UP", "RESOLVED"] as const;

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toneForStatus(status: string) {
  if (status === "NEW") return "info";
  if (status === "FOLLOW_UP") return "warning";
  if (status === "RESOLVED") return "success";
  return "neutral";
}

function formatCurrency(value?: number) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";
}

function messagePreview(value?: string) {
  return value?.trim() || "No message attached.";
}

export function EnquiriesPage() {
  const { data: enquiries = [], refetch } = useQuery({ queryKey: ["admin-enquiries"], queryFn: adminApi.getEnquiries });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof enquiryStatuses)[number]>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const counts = useMemo(
    () => ({
      followUp: enquiries.filter((enquiry) => enquiry.status === "FOLLOW_UP").length,
      new: enquiries.filter((enquiry) => enquiry.status === "NEW").length,
      resolved: enquiries.filter((enquiry) => enquiry.status === "RESOLVED").length,
      total: enquiries.length
    }),
    [enquiries]
  );

  const filteredEnquiries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enquiries
      .filter((enquiry) => {
        const searchMatch =
          !query ||
          `${enquiry.name} ${enquiry.phone} ${enquiry.email ?? ""} ${enquiry.companyName ?? ""} ${enquiry.enquiryType ?? ""} ${enquiry.message ?? ""}`
            .toLowerCase()
            .includes(query);
        const statusMatch = statusFilter === "ALL" ? true : enquiry.status === statusFilter;
        return searchMatch && statusMatch;
      })
      .slice()
      .sort((left, right) => {
        const statusWeight = { NEW: 0, FOLLOW_UP: 1, RESOLVED: 2 } as Record<Enquiry["status"], number>;
        const statusGap = statusWeight[left.status] - statusWeight[right.status];
        if (statusGap !== 0) return statusGap;
        return (right.updatedAt ?? right.createdAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? "");
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
      <section className="admin-shell overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff,#f8fafc_54%,#ecfeff)] p-6 xl:border-b-0 xl:border-r">
            <div className="admin-pill">Commerce</div>
            <h1 className="admin-display mt-4 text-4xl font-black text-slate-950">Enquiries inbox</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
              Prioritize inbound leads, follow up faster, and keep customer context visible while you work the conversation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="admin-chip admin-chip-active">{counts.total} total</span>
              <span className="admin-chip text-blue-700">{counts.new} new</span>
              <span className="admin-chip text-amber-700">{counts.followUp} follow up</span>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 2xl:grid-cols-4">
            <InboxMetric icon={<MessageSquareMore className="h-5 w-5" />} label="Total" value={counts.total} helper={`${filteredEnquiries.length} in view`} tone="blue" />
            <InboxMetric icon={<Clock3 className="h-5 w-5" />} label="New" value={counts.new} helper="Awaiting first response" tone="cyan" />
            <InboxMetric icon={<Phone className="h-5 w-5" />} label="Follow Up" value={counts.followUp} helper="Needs next touchpoint" tone="amber" />
            <InboxMetric icon={<CheckCircle2 className="h-5 w-5" />} label="Resolved" value={counts.resolved} helper="Closed conversations" tone="green" />
          </div>
        </div>
      </section>

      <section className="admin-shell p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-1.5">
            {enquiryStatuses.map((status) => {
              const count = status === "ALL" ? enquiries.length : enquiries.filter((enquiry) => enquiry.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-black transition ${
                    statusFilter === status ? "bg-[#1E63F2] text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  {status === "ALL" ? "All" : formatStatus(status)}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusFilter === status ? "bg-white/20 text-white" : "bg-white text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:max-w-[520px]">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-16 w-full rounded-[28px] border border-slate-300 bg-white pl-14 pr-5 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1E63F2] focus:ring-4 focus:ring-blue-100"
              placeholder="Search customer, phone, email, company, or message"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="admin-shell overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Conversation queue</h2>
              <p className="mt-1 text-sm text-slate-500">{filteredEnquiries.length} conversations in this view</p>
            </div>
            <MessageSquareMore className="h-5 w-5 text-[#1E63F2]" />
          </div>

          <div className="admin-scrollbar max-h-[calc(100vh-19rem)] overflow-y-auto p-3">
            <div className="space-y-3">
              {filteredEnquiries.map((enquiry) => {
                const selected = enquiry.id === selectedEnquiry?.id;
                return (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() => setSelectedId(enquiry.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      selected
                        ? "border-blue-200 bg-blue-50 shadow-[0_14px_34px_rgba(30,99,242,0.14)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-black ${selected ? "bg-[#1E63F2] text-white" : "bg-slate-100 text-slate-600"}`}>
                        {initials(enquiry.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-slate-950">{enquiry.name}</div>
                            <div className="mt-1 truncate text-xs font-semibold text-slate-500">{enquiry.phone}</div>
                          </div>
                          <StatusBadge tone={toneForStatus(enquiry.status)}>{formatStatus(enquiry.status)}</StatusBadge>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{messagePreview(enquiry.message)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                          <span>{formatDateTime(enquiry.createdAt)}</span>
                          {enquiry.enquiryType ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">{formatStatus(enquiry.enquiryType)}</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!filteredEnquiries.length ? (
                <div className="px-4 py-10">
                  <EmptyState title="No enquiries match this view" description="Try another status tab or search term." />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-shell overflow-hidden p-0">
          {selectedEnquiry ? (
            <>
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)] px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#1E63F2] text-xl font-black text-white shadow-lg shadow-blue-500/25">
                      {initials(selectedEnquiry.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-950">{selectedEnquiry.name}</h2>
                        <StatusBadge tone={toneForStatus(selectedEnquiry.status)}>{formatStatus(selectedEnquiry.status)}</StatusBadge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />{selectedEnquiry.phone}</span>
                        {selectedEnquiry.email ? <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{selectedEnquiry.email}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a className="admin-button-secondary inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold" href={`tel:${selectedEnquiry.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                    <a
                      className="admin-button inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold"
                      href={`https://wa.me/${selectedEnquiry.phone.replace(/\D/g, "")}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:p-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="admin-section-label">Customer message</div>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Received {formatDateTime(selectedEnquiry.createdAt)}</p>
                      </div>
                      <MessageSquareMore className="h-5 w-5 text-[#1E63F2]" />
                    </div>
                    <div className="mt-5 rounded-[24px] bg-slate-50 p-5 text-base leading-8 text-slate-700">
                      {messagePreview(selectedEnquiry.message)}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoTile icon={<UserRound className="h-5 w-5" />} label="Type" value={selectedEnquiry.enquiryType ? formatStatus(selectedEnquiry.enquiryType) : "General"} />
                    <InfoTile icon={<Building2 className="h-5 w-5" />} label="Company" value={selectedEnquiry.companyName || "-"} />
                    <InfoTile icon={<IndianRupee className="h-5 w-5" />} label="Budget" value={formatCurrency(selectedEnquiry.budget)} />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="admin-section-label">Workflow guide</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <WorkflowStep active={selectedEnquiry.status === "NEW"} title="1. First response" description="Call or WhatsApp customer." />
                      <WorkflowStep active={selectedEnquiry.status === "FOLLOW_UP"} title="2. Follow up" description="Track the next touchpoint." />
                      <WorkflowStep active={selectedEnquiry.status === "RESOLVED"} title="3. Resolve" description="Close after request is handled." />
                    </div>
                  </div>
                </div>

                <aside className="space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="admin-section-label">Update status</div>
                    <div className="mt-4 grid gap-3">
                      {["NEW", "FOLLOW_UP", "RESOLVED"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void updateStatus(selectedEnquiry.id, status)}
                          className={`rounded-[20px] border px-4 py-3 text-left text-sm font-black transition ${
                            selectedEnquiry.status === status
                              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {formatStatus(status)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="admin-section-label">Contact snapshot</div>
                    <div className="mt-4 space-y-4">
                      <SnapshotRow label="Phone" value={selectedEnquiry.phone} href={`tel:${selectedEnquiry.phone}`} />
                      <SnapshotRow label="Email" value={selectedEnquiry.email || "-"} href={selectedEnquiry.email ? `mailto:${selectedEnquiry.email}` : undefined} />
                      <SnapshotRow label="Quantity" value={selectedEnquiry.quantity != null ? String(selectedEnquiry.quantity) : "-"} />
                      <SnapshotRow label="Updated" value={formatDateTime(selectedEnquiry.updatedAt)} />
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="grid min-h-[460px] place-items-center px-6 py-12 text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-400">
                  <MessageSquareMore className="h-7 w-7" />
                </div>
                <div className="mt-5 text-xl font-black text-slate-900">Select an enquiry</div>
                <p className="mt-2 text-sm text-slate-500">Choose a conversation from the queue to inspect the message and take action.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InboxMetric({ helper, icon, label, tone, value }: { helper: string; icon: ReactNode; label: string; tone: "amber" | "blue" | "cyan" | "green"; value: number }) {
  const toneClass = {
    amber: "border-amber-100 bg-amber-50/40 text-amber-700",
    blue: "border-blue-100 bg-blue-50/40 text-blue-700",
    cyan: "border-cyan-100 bg-cyan-50/40 text-cyan-700",
    green: "border-emerald-100 bg-emerald-50/40 text-emerald-700"
  }[tone];

  return (
    <article className={`rounded-[28px] border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">{label}</div>
          <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
          <div className="mt-2 text-sm font-black text-slate-500">{helper}</div>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">{icon}</span>
      </div>
    </article>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-[#1E63F2]">{icon}</div>
      <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 break-words text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function WorkflowStep({ active, description, title }: { active: boolean; description: string; title: string }) {
  return (
    <div className={`rounded-[22px] border p-4 ${active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
      <div className={`text-sm font-black ${active ? "text-blue-700" : "text-slate-700"}`}>{title}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SnapshotRow({ href, label, value }: { href?: string; label: string; value: string }) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</div>
      </div>
      {href ? <ArrowUpRight className="h-4 w-4 shrink-0 text-[#1E63F2]" /> : null}
    </div>
  );

  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : content;
}
