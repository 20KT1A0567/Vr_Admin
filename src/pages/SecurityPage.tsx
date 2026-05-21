import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock3,
  Copy,
  Globe2,
  KeyRound,
  Laptop,
  LogOut,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet
} from "lucide-react";
import toast from "react-hot-toast";
import { accountSecurityApi, getApiErrorMessage } from "api/client";
import { ActionButton } from "components/admin/ActionButton";
import { ConfirmDialog } from "components/admin/ConfirmDialog";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { StatCard } from "components/admin/StatCard";
import type { AdminSession, BackupCodeStatus } from "types";
import { cn } from "utils/cn";

function deviceIconFor(userAgent?: string) {
  if (!userAgent) return Laptop;
  const ua = userAgent.toLowerCase();
  if (/iphone|android.*mobile|ipod/.test(ua)) return Smartphone;
  if (/ipad|tablet/.test(ua)) return Tablet;
  return Laptop;
}

function shortDevice(userAgent?: string) {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" :
    "Browser";
  const os =
    /Windows NT/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" :
    "Unknown OS";
  return `${browser} on ${os}`;
}

function formatRelative(value?: string) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "—";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} d ago`;
  return new Date(ts).toLocaleDateString();
}

export function SecurityPage() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["account-sessions"],
    queryFn: () => accountSecurityApi.listSessions()
  });

  const backupQuery = useQuery({
    queryKey: ["backup-code-status"],
    queryFn: () => accountSecurityApi.backupCodeStatus()
  });

  const [pendingRevoke, setPendingRevoke] = useState<AdminSession | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [latestCodes, setLatestCodes] = useState<string[] | null>(null);

  const revokeMutation = useMutation({
    mutationFn: (id: number) => accountSecurityApi.revokeSession(id),
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({ queryKey: ["account-sessions"] });
      setPendingRevoke(null);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to revoke session"))
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => accountSecurityApi.revokeOtherSessions(),
    onSuccess: () => {
      toast.success("All other sessions revoked");
      queryClient.invalidateQueries({ queryKey: ["account-sessions"] });
      setConfirmRevokeOthers(false);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to revoke sessions"))
  });

  const regenerateMutation = useMutation<BackupCodeStatus>({
    mutationFn: () => accountSecurityApi.regenerateBackupCodes(),
    onSuccess: (data) => {
      toast.success("New backup codes generated. Save them now.");
      setLatestCodes(data.generatedCodes ?? []);
      queryClient.invalidateQueries({ queryKey: ["backup-code-status"] });
      setConfirmRegenerate(false);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to generate backup codes"))
  });

  const sortedSessions = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    return [...sessions].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      const aTs = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const bTs = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      return bTs - aTs;
    });
  }, [sessionsQuery.data]);

  const otherSessions = sortedSessions.filter((s) => !s.current);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account Fortress"
        title="Security Command"
        description="Govern your administrative credentials. Monitor active session nodes, manage multi-factor backup protocols, and execute global sign-out triggers."
        variant="premium"
        actions={
          <button 
            type="button" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50 disabled:opacity-50" 
            disabled={otherSessions.length === 0 || revokeOthersMutation.isPending}
            onClick={() => setConfirmRevokeOthers(true)}
          >
            <LogOut className="h-4 w-4" />
            Sign Out Remote Nodes ({otherSessions.length})
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Nodes"
            value={String(sortedSessions.length)}
            meta="Concurrent session traces"
            icon={<Globe2 className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Verified Buffer"
            value={String(backupQuery.data?.active ?? 0)}
            meta="Redundant access codes"
            icon={<ShieldCheck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Security State"
            value="Optimal"
            meta="Core credential integrity"
            icon={<ShieldCheck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Threat Level"
            value="Baseline"
            meta="Global account heuristics"
            icon={<ShieldAlert className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      {/* Sessions */}
      <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Session Intelligence
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Active Protocol Nodes</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Devices currently authenticated within this security context.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Auth Stream</span>
          </div>
        </div>

        <div className="divide-y divide-slate-50 p-6 dark:divide-white/5">
          {sessionsQuery.isLoading ? (
            <SkeletonLoader lines={3} />
          ) : sortedSessions.length === 0 ? (
            <EmptyState
              icon={<Globe2 className="h-6 w-6" />}
              title="No active sessions yet"
              description="Sessions will show up here as soon as you sign in from any device."
            />
          ) : (
            sortedSessions.map((session) => {
              const Icon = deviceIconFor(session.userAgent);
              return (
                <article
                  key={session.id}
                  className="group flex flex-wrap items-center gap-6 rounded-[1.5rem] bg-transparent p-5 transition-all hover:bg-slate-50 dark:hover:bg-white/2"
                >
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-[1.25rem] transition-all shadow-inner",
                    session.current ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{shortDevice(session.userAgent)}</span>
                      {session.current ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                          <Check className="h-3 w-3" /> Root Node
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5" /> {session.ipAddress ?? "Unknown IP"}</span>
                      <span className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> Heartbeat {formatRelative(session.lastUsedAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={session.current || revokeMutation.isPending}
                    onClick={() => setPendingRevoke(session)}
                    className="flex h-12 items-center justify-center rounded-xl border border-slate-100 bg-white px-6 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-xl transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-0 dark:border-white/5 dark:bg-slate-800 dark:text-white"
                  >
                    Kill Process
                  </button>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Backup codes */}
      <section className="admin-surface rounded-3xl border border-[color:var(--color-border)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[color:var(--color-text)]">Backup codes</h2>
            <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-subtle)]">
              One-time codes you can use instead of the email OTP if you lose access to your inbox.
              Each code works once. Generating new codes invalidates all previous ones.
            </p>
          </div>
          <ActionButton
            icon={<RefreshCcw className="h-4 w-4" />}
            onClick={() => setConfirmRegenerate(true)}
            disabled={regenerateMutation.isPending}
          >
            {backupQuery.data?.exists ? "Regenerate codes" : "Generate codes"}
          </ActionButton>
        </div>

        {backupQuery.isLoading ? (
          <div className="mt-5"><SkeletonLoader lines={2} /></div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <BackupStat label="Active" value={backupQuery.data?.active ?? 0} accent="emerald" />
            <BackupStat label="Total issued" value={backupQuery.data?.total ?? 0} accent="indigo" />
            <BackupStat
              label="Status"
              value={(backupQuery.data?.active ?? 0) > 0 ? "Ready" : "Generate codes"}
              accent={(backupQuery.data?.active ?? 0) > 0 ? "emerald" : "amber"}
            />
          </div>
        )}

        {latestCodes && latestCodes.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <div className="font-extrabold text-amber-900 dark:text-amber-100">Save these codes now</div>
                <p className="mt-1 text-sm leading-6 text-amber-800/90 dark:text-amber-100/80">
                  This is the only time you will see them. Store them somewhere safe — a password manager works well.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {latestCodes.map((code) => (
                    <code
                      key={code}
                      className="block rounded-lg bg-white px-3 py-2 text-center text-sm font-mono font-bold tracking-[0.18em] text-slate-900 ring-1 ring-amber-300 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    variant="secondary"
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => {
                      navigator.clipboard.writeText(latestCodes.join("\n"));
                      toast.success("Copied to clipboard");
                    }}
                  >
                    Copy all
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={() => setLatestCodes(null)}>
                    I have saved them
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!backupQuery.isLoading && !backupQuery.data?.exists && !latestCodes ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-4 text-sm leading-6 text-[color:var(--color-text-subtle)]">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-accent)]" />
            <span>
              You have no backup codes yet. Generate a fresh batch so you can sign in even if your email is unreachable.
            </span>
          </div>
        ) : null}
      </section>

      <ShieldCheck className="hidden" aria-hidden />

      <ConfirmDialog
        open={!!pendingRevoke}
        title="Revoke this session?"
        description={`The device "${shortDevice(pendingRevoke?.userAgent)}" will be signed out immediately and will need to log in again.`}
        confirmLabel="Revoke session"
        tone="danger"
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => pendingRevoke && revokeMutation.mutate(pendingRevoke.id)}
        loading={revokeMutation.isPending}
      />

      <ConfirmDialog
        open={confirmRevokeOthers}
        title="Sign out from all other devices?"
        description="Every active session except this one will be revoked. You will stay signed in here."
        confirmLabel="Sign out other devices"
        tone="danger"
        onClose={() => setConfirmRevokeOthers(false)}
        onConfirm={() => revokeOthersMutation.mutate()}
        loading={revokeOthersMutation.isPending}
      />

      <ConfirmDialog
        open={confirmRegenerate}
        title={backupQuery.data?.exists ? "Regenerate backup codes?" : "Generate backup codes?"}
        description={
          backupQuery.data?.exists
            ? "Your existing codes will stop working immediately. You will receive 10 new codes — copy them somewhere safe."
            : "You will receive 10 one-time codes. Copy them and store them somewhere safe — they cannot be shown again."
        }
        confirmLabel={backupQuery.data?.exists ? "Regenerate" : "Generate"}
        tone={backupQuery.data?.exists ? "danger" : "default"}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={() => regenerateMutation.mutate()}
        loading={regenerateMutation.isPending}
      />
    </div>
  );
}

function BackupStat({
  label,
  value,
  accent
}: {
  label: string;
  value: string | number;
  accent: "emerald" | "indigo" | "amber";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-indigo-600";
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-4">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${accentClass}`}>{value}</div>
    </div>
  );
}
