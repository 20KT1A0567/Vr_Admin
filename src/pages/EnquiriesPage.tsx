import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareMore, Search } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "api/client";

function formatStatus(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function EnquiriesPage() {
  const { data: enquiries = [], refetch } = useQuery({ queryKey: ["admin-enquiries"], queryFn: adminApi.getEnquiries });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enquiry) => {
      const searchMatch = `${enquiry.name} ${enquiry.phone} ${enquiry.email ?? ""} ${enquiry.message ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const statusMatch = statusFilter === "ALL" ? true : enquiry.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [enquiries, search, statusFilter]);

  const newCount = enquiries.filter((enquiry) => enquiry.status === "NEW").length;
  const followUpCount = enquiries.filter((enquiry) => enquiry.status === "FOLLOW_UP").length;

  return (
    <div className="space-y-4">
      <section className="admin-shell px-6 py-5 lg:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="admin-pill">Enquiries</div>
            <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950 lg:text-4xl">Turn inbound messages into a visible follow-up queue instead of buried admin noise.</h1>
            <p className="mt-3 max-w-3xl text-slate-500">
              This page now mirrors the reference panel style and makes enquiry handling feel like a proper support workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total enquiries</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{enquiries.length}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">New</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{newCount}</div>
            </article>
            <article className="admin-shell-muted p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Follow up</div>
              <div className="admin-display mt-2 text-3xl font-semibold text-slate-950">{followUpCount}</div>
            </article>
          </div>
        </div>
      </section>

      <section className="admin-shell p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[260px] flex-1 max-w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="admin-input pl-11" placeholder="Search customer, phone, email, or message" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="admin-select min-w-[180px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            {["NEW", "FOLLOW_UP", "RESOLVED"].map((option) => (
              <option key={option} value={option}>
                {formatStatus(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredEnquiries.map((enquiry) => (
            <article key={enquiry.id} className="admin-shell-muted p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700">
                    <MessageSquareMore className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{enquiry.name}</h2>
                      <span className={enquiry.status === "NEW" ? "admin-badge-green" : enquiry.status === "FOLLOW_UP" ? "admin-badge-amber" : "admin-badge-slate"}>
                        {formatStatus(enquiry.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>{enquiry.phone}</span>
                      {enquiry.email ? <span>{enquiry.email}</span> : null}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{enquiry.message ?? "No message attached."}</p>
                  </div>
                </div>

                <select
                  className="admin-select min-w-[180px]"
                  value={enquiry.status}
                  onChange={async (event) => {
                    await adminApi.updateEnquiryStatus(enquiry.id, event.target.value);
                    toast.success("Enquiry updated");
                    await refetch();
                  }}
                >
                  {["NEW", "FOLLOW_UP", "RESOLVED"].map((option) => (
                    <option key={option} value={option}>
                      {formatStatus(option)}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
          {!filteredEnquiries.length ? (
            <div className="admin-shell-muted px-6 py-12 text-center text-slate-400">No enquiries match this view.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
