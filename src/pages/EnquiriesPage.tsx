import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, IndianRupee, Mail, MessageSquareMore, Phone, Search, Send, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { StatusBadge } from "components/admin/StatusBadge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "utils/cn";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commerce"
        title="Enquiries Inbox"
        description="Prioritize inbound leads, follow up faster, and keep customer context visible while you work the conversation."
        variant="premium"
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Traffic"
            value={String(counts.total)}
            meta={`${filteredEnquiries.length} in current view`}
            icon={<MessageSquareMore className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Unprocessed"
            value={String(counts.new)}
            meta="Awaiting first protocol"
            icon={<Clock3 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="In Engagement"
            value={String(counts.followUp)}
            meta="Active touchpoints"
            icon={<Phone className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Resolved"
            value={String(counts.resolved)}
            meta="Successfully concluded"
            icon={<CheckCircle2 className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2 rounded-[2rem] bg-slate-50 p-2 dark:bg-white/5">
            {enquiryStatuses.map((status) => {
              const count = status === "ALL" ? enquiries.length : enquiries.filter((enquiry) => enquiry.status === status).length;
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-[1.5rem] px-6 py-3 text-xs font-black uppercase tracking-widest transition-all",
                    active 
                      ? "bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900" 
                      : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {status === "ALL" ? "All Channels" : formatStatus(status)}
                  <span className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px]",
                    active ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:max-w-[520px]">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="admin-input !h-16 !rounded-[2rem] !bg-slate-50 pl-16 pr-6 shadow-none focus:ring-4 focus:ring-sky-500/10 dark:!bg-white/5"
              placeholder="Search conversations, identity, or metadata..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="admin-card-elevated flex flex-col overflow-hidden border-none bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-white/5 dark:bg-white/2">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Conversation Queue</h2>
              <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{filteredEnquiries.length} Active Records</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <MessageSquareMore className="h-5 w-5" />
            </div>
          </div>

          <div className="admin-scrollbar max-h-[calc(100vh-22rem)] overflow-y-auto p-4">
            <div className="space-y-3">
              {filteredEnquiries.map((enquiry) => {
                const selected = enquiry.id === selectedEnquiry?.id;
                return (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() => setSelectedId(enquiry.id)}
                    className={cn(
                      "group relative w-full rounded-[2rem] p-6 text-left transition-all duration-300",
                      selected
                        ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 dark:bg-white dark:text-slate-900"
                        : "bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-black transition-colors duration-300",
                        selected ? "bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900" : "bg-white text-slate-900 shadow-sm dark:bg-white/5 dark:text-white"
                      )}>
                        {initials(enquiry.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-black tracking-tight">{enquiry.name}</div>
                            <div className={cn("mt-1 truncate text-[11px] font-bold uppercase tracking-widest", selected ? "text-sky-400" : "text-slate-400")}>{enquiry.phone}</div>
                          </div>
                          <span className={cn(
                            "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                            selected ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-sky-500/10 text-sky-500"
                          )}>
                            {formatStatus(enquiry.status)}
                          </span>
                        </div>
                        <p className={cn("mt-4 line-clamp-2 text-sm font-medium leading-relaxed", selected ? "text-white/70 dark:text-slate-600" : "text-slate-500")}>
                          {messagePreview(enquiry.message)}
                        </p>
                      </div>
                    </div>
                    {selected && (
                      <motion.div layoutId="queue-indicator" className="absolute -left-1 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="admin-card-elevated overflow-hidden border-none bg-white shadow-2xl dark:bg-slate-900">
          {selectedEnquiry ? (
            <>
              <div className="border-b border-slate-100 bg-slate-50/50 px-10 py-10 dark:border-white/5 dark:bg-white/2">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-8">
                    <div className="grid h-24 w-24 place-items-center rounded-[2.5rem] bg-slate-900 text-3xl font-black text-white shadow-2xl dark:bg-white dark:text-slate-900">
                      {initials(selectedEnquiry.name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-4">
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{selectedEnquiry.name}</h2>
                        <span className={cn(
                          "rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-widest",
                          toneForStatus(selectedEnquiry.status) === "success" ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"
                        )}>
                          {formatStatus(selectedEnquiry.status)} Protocol
                        </span>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-6 text-[13px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-3"><Phone className="h-5 w-5 text-sky-500" />{selectedEnquiry.phone}</span>
                        {selectedEnquiry.email && <span className="inline-flex items-center gap-3"><Mail className="h-5 w-5 text-sky-500" />{selectedEnquiry.email}</span>}
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <span className="text-slate-400 uppercase tracking-widest text-[11px]">ID: ENQ-{selectedEnquiry.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a className="group flex items-center justify-center gap-3 rounded-2xl bg-slate-100 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:text-white dark:hover:bg-white dark:hover:text-slate-900" href={`tel:${selectedEnquiry.phone}`}>
                      <Phone className="h-4 w-4 transition-transform group-hover:rotate-12" />
                      Voice Channel
                    </a>
                    <a
                      className="group flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                      href={`https://wa.me/${selectedEnquiry.phone.replace(/\D/g, "")}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      Direct WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 p-10 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-8">
                  <div className="admin-card-elevated border-none bg-slate-50 p-10 shadow-inner dark:bg-white/2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Intelligence Record</div>
                        <p className="mt-2 text-xs font-bold text-sky-500 uppercase tracking-widest">Received {formatDateTime(selectedEnquiry.createdAt)}</p>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-xl dark:bg-white/5">
                        <MessageSquareMore className="h-7 w-7" />
                      </div>
                    </div>
                    <div className="mt-10 text-xl font-medium leading-[2.5rem] text-slate-700 dark:text-slate-300">
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
