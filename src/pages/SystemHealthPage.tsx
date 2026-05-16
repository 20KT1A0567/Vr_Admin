import { useQuery } from "@tanstack/react-query";
import { CreditCard, Database, ServerCog, UploadCloud } from "lucide-react";
import { adminApi } from "api/client";

export function SystemHealthPage() {
  const { data: health } = useQuery({ queryKey: ["admin-system-health"], queryFn: adminApi.getSystemHealth, refetchInterval: 60000 });

  return (
    <div className="space-y-5">
      <div className="admin-card-elevated rounded-[24px] p-6">
        <div className="admin-pill">System</div>
        <h1 className="mt-3 text-2xl font-black text-slate-950">System Health</h1>
        <p className="mt-1 text-sm text-slate-500">Backend readiness for DB, uploads, payments, and API operations.</p>
        <div className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-black ${health?.status === "OK" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {health?.status ?? "Checking"}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(health?.components ?? []).map((component) => (
          <article key={component.key} className="admin-card-elevated rounded-[24px] p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${component.status === "OK" ? "bg-emerald-50 text-emerald-700" : component.status === "ERROR" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
              {component.key === "database" ? <Database className="h-5 w-5" /> : component.key === "cloudinary" ? <UploadCloud className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-950">{component.label}</h2>
            <div className="mt-1 text-sm font-bold text-slate-500">{component.status}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{component.message}</p>
          </article>
        ))}
        {!health ? (
          <article className="admin-card-elevated rounded-[24px] p-5 text-sm text-slate-500">
            <ServerCog className="mb-4 h-6 w-6" />
            Loading health checks...
          </article>
        ) : null}
      </div>
    </div>
  );
}
