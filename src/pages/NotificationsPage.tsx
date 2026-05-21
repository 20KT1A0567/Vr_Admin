import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock3, Inbox } from "lucide-react";
import { adminApi } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { Card } from "components/ui/Card";
import { Button } from "components/ui/Button";
import { cn } from "utils/cn";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({ 
    queryKey: ["admin-notifications"], 
    queryFn: adminApi.getNotifications 
  });
  
  const markRead = useMutation({
    mutationFn: adminApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-topbar"] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: adminApi.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-topbar"] });
    }
  });

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations Intelligence"
        title="Command Feed"
        description="Real-time telemetry of system alerts, order events, and fulfillment signals. Monitor the heartbeat of your ecosystem."
        variant="premium"
        actions={
          <button 
            type="button" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50 disabled:opacity-50" 
            disabled={!unreadCount || markAllRead.isPending} 
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="h-4 w-4" />
            Flush Buffer
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Live Buffer"
            value={String(notifications.length)}
            meta="Total alerts in feed"
            icon={<Inbox className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Action Required"
            value={String(unreadCount)}
            meta="Unread notifications"
            icon={<Bell className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="System State"
            value="Stable"
            meta="Core operational status"
            icon={<CheckCheck className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Alert Density"
            value="Optimal"
            meta="Signal-to-noise ratio"
            icon={<Inbox className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      {/* Notifications List */}
      <div className="grid gap-4">
        {notifications.length ? (
          notifications.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "admin-card-elevated border-none p-0 shadow-2xl transition-all duration-500 overflow-hidden",
                !item.read ? "bg-white dark:bg-slate-900 ring-2 ring-blue-500/20" : "bg-slate-50/50 opacity-60 dark:bg-white/2"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-6 p-8">
                <div className="flex min-w-0 gap-6">
                  <div className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] transition-all shadow-inner",
                    item.read 
                      ? "bg-slate-200 text-slate-500" 
                      : "bg-blue-500/10 text-blue-600"
                  )}>
                    <Bell className={cn("h-7 w-7", !item.read && "animate-bounce")} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {item.eventType} • {item.channel}
                      </span>
                      {!item.read && (
                        <span className="flex items-center gap-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-600">
                          <span className="h-1 w-1 rounded-full bg-blue-600 animate-pulse" />
                          New
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {item.subject || item.status}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      {item.message || "Protocol transmission received with no attached payload."}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock3 className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                
                {!item.read && (
                  <button 
                    type="button"
                    disabled={markRead.isPending} 
                    onClick={() => markRead.mutate(item.id)}
                    className="flex h-12 items-center justify-center rounded-xl border border-slate-100 bg-white px-6 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-xl transition-all hover:bg-slate-50 dark:border-white/5 dark:bg-slate-800 dark:text-white"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] border-4 border-dashed border-slate-100 dark:border-white/5">
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-50 text-slate-300 dark:bg-white/2">
              <Inbox className="h-10 w-10 opacity-20" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Inbox Architecture is Clear</p>
          </div>
        )}
      </div>
    </div>
  );
}
