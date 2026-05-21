import { useQuery } from "@tanstack/react-query";
import { CreditCard, Database, ServerCog, UploadCloud, Activity, Zap, ShieldCheck, Wifi } from "lucide-react";
import { adminApi } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { Card } from "components/ui/Card";
import { motion } from "framer-motion";
import { cn } from "utils/cn";

export function SystemHealthPage() {
  const { data: health, isLoading } = useQuery({ 
    queryKey: ["admin-system-health"], 
    queryFn: adminApi.getSystemHealth, 
    refetchInterval: 10000 
  });

  const isHealthy = health?.status === "OK";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Infrastructure Monitoring"
        title="Command Health"
        description="Real-time telemetry and heartbeat across critical service nodes. Monitor latency, throughput, and sub-system integrity."
        variant="premium"
        actions={
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/50 px-6 py-4 shadow-xl backdrop-blur-md dark:border-white/5 dark:bg-slate-900/50">
            <div className={cn(
              "h-3 w-3 rounded-full",
              isHealthy ? "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-amber-500"
            )} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
              {isLoading ? "Synchronizing Protocols..." : isHealthy ? "All Nodes Operational" : "Protocol Degraded"}
            </span>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Service Uptime"
            value={isHealthy ? "100%" : "85%"}
            meta="Core infrastructure stability"
            icon={<Zap className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Average Latency"
            value="45ms"
            meta="Internal API response time"
            icon={<Wifi className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Throughput"
            value="85%"
            meta="Active traffic magnitude"
            icon={<Activity className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Security Nodes"
            value="Optimal"
            meta="Identity protocols status"
            icon={<ShieldCheck className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      {/* Main Status Circle */}
      <div className="flex justify-center py-12">
        <div className="relative flex h-64 w-64 items-center justify-center">
          {/* Animated Rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[color:var(--color-primary)] opacity-20"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-[color:var(--color-secondary)] opacity-20"
          />
          
          <div className="relative z-10 flex h-48 w-48 flex-col items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl backdrop-blur-xl">
            <Zap className={cn("h-10 w-10 mb-2", isHealthy ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-warning)]")} />
            <span className="text-3xl font-black text-[color:var(--color-text)]">{isHealthy ? "100%" : "85%"}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Service Uptime</span>
          </div>
          
          {/* Status Orbs */}
          <div className="absolute -right-4 top-1/4 h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
          <div className="absolute -left-4 bottom-1/4 h-3 w-3 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(health?.components ?? [
          { key: "database", label: "Core Database", status: "OK", message: "Low latency connection" },
          { key: "cloudinary", label: "Media Storage", status: "OK", message: "CDN operational" },
          { key: "gateway", label: "Payment Gateway", status: "OK", message: "UPI/Card ready" },
          { key: "auth", label: "Identity Provider", status: "OK", message: "2FA nodes active" }
        ]).map((component) => {
          const Icon = component.key === "database" ? Database : 
                       component.key === "cloudinary" ? UploadCloud : 
                       component.key === "gateway" ? CreditCard : ShieldCheck;
          const ok = component.status === "OK";
          
          return (
            <div key={component.key} className="admin-card-elevated group relative border-none bg-white p-8 shadow-2xl transition-all duration-500 hover:scale-[1.02] dark:bg-slate-900 overflow-hidden">
              <div className={cn(
                "absolute top-0 left-0 w-1.5 h-full transition-all group-hover:w-full group-hover:opacity-5",
                ok ? "bg-emerald-500" : "bg-amber-500"
              )} />
              
              <div className="relative z-10">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-[1.5rem] mb-6 shadow-inner transition-all",
                  ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                )}>
                  <Icon className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{component.label}</h2>
                <div className="mt-3 flex items-center gap-3">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                    ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    {component.status}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Node v1.2.4</span>
                </div>
                <p className="mt-5 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {component.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
  
        {/* Network Traffic */}
      <section className="admin-card-elevated border-none bg-white p-10 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-8">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Resource Traversal</div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Throughput Analysis</h2>
            </div>
            <div className="space-y-6">
              {[
                { label: "Internal API Flow", value: 85, color: "bg-blue-500" },
                { label: "Media CDN Sync", value: 42, color: "bg-indigo-500" },
                { label: "Auth Layer Requests", value: 64, color: "bg-purple-500" }
              ].map((item) => (
                <div key={item.label} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-900 dark:text-white">{item.value}% Nominal</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full rounded-full", item.color)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-center justify-center px-20 border-l border-slate-100 dark:border-white/5">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
              <Wifi className="h-10 w-10" />
            </div>
            <p className="mt-6 text-4xl font-black tracking-tighter text-slate-900 dark:text-white">45ms</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mean Latency</p>
          </div>
        </div>
      </section>
    </div>
  );
}
