import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { adminApi } from "api/client";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({ queryKey: ["admin-notifications"], queryFn: adminApi.getNotifications });
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
    <div className="space-y-5">
      <div className="admin-card-elevated rounded-[24px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="admin-pill">Operations</div>
            <h1 className="mt-3 text-2xl font-black text-slate-950">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">Low stock, orders, returns, enquiries, payment events, and system messages.</p>
          </div>
          <button className="admin-button" disabled={!unreadCount || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {notifications.length ? (
          notifications.map((item) => (
            <article key={item.id} className={`rounded-[22px] border p-5 shadow-sm ${item.read ? "border-slate-200 bg-white" : "border-blue-100 bg-blue-50/70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.read ? "bg-slate-100 text-slate-500" : "bg-[#1E63F2] text-white"}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.eventType} · {item.channel}</div>
                    <h2 className="mt-1 text-base font-black text-slate-950">{item.subject || item.status}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.message || "No message body."}</p>
                    <div className="mt-2 text-xs font-semibold text-slate-400">{new Date(item.createdAt).toLocaleString("en-IN")}</div>
                  </div>
                </div>
                {!item.read ? (
                  <button className="admin-button-secondary !px-4 !py-2 text-sm" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}>
                    Mark read
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="admin-card-elevated rounded-[24px] p-10 text-center text-sm text-slate-500">No notifications yet.</div>
        )}
      </div>
    </div>
  );
}
