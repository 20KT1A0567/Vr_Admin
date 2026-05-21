import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Mail, MessageCircleMore, PencilLine, Smartphone, Sparkles, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";
import { cn } from "utils/cn";

type NotificationEventKey =
  | "ORDER_PLACED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "RETURN_REQUEST"
  | "REFUND_UPDATE"
  | "ENQUIRY_REPLY"
  | "OTP_LOGIN";

type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";

type ChannelTemplate = {
  enabled: boolean;
  subject?: string;
  message: string;
};

type NotificationTemplateRecord = Record<NotificationChannel, ChannelTemplate>;

type NotificationTemplateDefinition = {
  key: NotificationEventKey;
  label: string;
  description: string;
  variables: string[];
};

type NotificationTemplatesState = Record<NotificationEventKey, NotificationTemplateRecord>;

const STORAGE_KEY = "vrtech-admin-notification-templates";

const eventDefinitions: NotificationTemplateDefinition[] = [
  {
    key: "ORDER_PLACED",
    label: "Order placed",
    description: "Triggered right after an order is confirmed in the storefront or by admin operations.",
    variables: ["{{customer_name}}", "{{order_number}}", "{{order_total}}", "{{store_name}}"]
  },
  {
    key: "ORDER_SHIPPED",
    label: "Order shipped",
    description: "Sent when shipment details are attached and the order leaves the warehouse or branch.",
    variables: ["{{customer_name}}", "{{order_number}}", "{{tracking_number}}", "{{tracking_url}}"]
  },
  {
    key: "ORDER_DELIVERED",
    label: "Order delivered",
    description: "Confirms successful delivery and can encourage support follow-up or review capture.",
    variables: ["{{customer_name}}", "{{order_number}}", "{{delivered_at}}", "{{support_phone}}"]
  },
  {
    key: "RETURN_REQUEST",
    label: "Return request",
    description: "Acknowledges a customer return request and explains next operational steps.",
    variables: ["{{customer_name}}", "{{order_number}}", "{{return_reason}}", "{{pickup_window}}"]
  },
  {
    key: "REFUND_UPDATE",
    label: "Refund update",
    description: "Keeps customers informed when a refund is approved, initiated, or completed.",
    variables: ["{{customer_name}}", "{{order_number}}", "{{refund_amount}}", "{{refund_status}}"]
  },
  {
    key: "ENQUIRY_REPLY",
    label: "Enquiry reply",
    description: "Used by the support team when responding to general product or sales enquiries.",
    variables: ["{{customer_name}}", "{{enquiry_type}}", "{{agent_name}}", "{{support_email}}"]
  },
  {
    key: "OTP_LOGIN",
    label: "OTP / login message",
    description: "Authentication code and security notification used for sign-in or verification flows.",
    variables: ["{{customer_name}}", "{{otp_code}}", "{{expiry_minutes}}", "{{app_name}}"]
  }
];

const channelMeta: Record<
  NotificationChannel,
  { label: string; icon: JSX.Element; supportsSubject: boolean; tone: string; previewLabel: string }
> = {
  EMAIL: {
    label: "Email",
    icon: <Mail className="h-4 w-4" />,
    supportsSubject: true,
    tone: "bg-sky-50 text-sky-700",
    previewLabel: "Email preview"
  },
  SMS: {
    label: "SMS",
    icon: <Smartphone className="h-4 w-4" />,
    supportsSubject: false,
    tone: "bg-amber-50 text-amber-700",
    previewLabel: "SMS preview"
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: <MessageCircleMore className="h-4 w-4" />,
    supportsSubject: false,
    tone: "bg-emerald-50 text-emerald-700",
    previewLabel: "WhatsApp preview"
  },
  PUSH: {
    label: "Push notification",
    icon: <BellRing className="h-4 w-4" />,
    supportsSubject: true,
    tone: "bg-violet-50 text-violet-700",
    previewLabel: "Push preview"
  }
};

const defaultTemplates: NotificationTemplatesState = {
  ORDER_PLACED: {
    EMAIL: {
      enabled: true,
      subject: "Your order {{order_number}} has been placed",
      message:
        "Hi {{customer_name}},\n\nThank you for shopping with us. Your order {{order_number}} worth {{order_total}} has been placed successfully.\n\nStore: {{store_name}}\nWe will notify you again when your items move to the next step."
    },
    SMS: {
      enabled: true,
      message: "Hi {{customer_name}}, your order {{order_number}} for {{order_total}} has been placed successfully."
    },
    WHATSAPP: {
      enabled: true,
      message: "Hello {{customer_name}}, your order {{order_number}} has been placed successfully. Order total: {{order_total}}."
    },
    PUSH: {
      enabled: true,
      subject: "Order placed",
      message: "Your order {{order_number}} has been confirmed."
    }
  },
  ORDER_SHIPPED: {
    EMAIL: {
      enabled: true,
      subject: "Your order {{order_number}} is on the way",
      message:
        "Hi {{customer_name}},\n\nYour order {{order_number}} has been shipped.\nTracking number: {{tracking_number}}\nTrack here: {{tracking_url}}\n\nThank you for shopping with us."
    },
    SMS: {
      enabled: true,
      message: "Order {{order_number}} shipped. Tracking no: {{tracking_number}}. Track: {{tracking_url}}"
    },
    WHATSAPP: {
      enabled: true,
      message: "Your order {{order_number}} is shipped. Tracking number: {{tracking_number}}. Track here: {{tracking_url}}"
    },
    PUSH: {
      enabled: true,
      subject: "Order shipped",
      message: "Order {{order_number}} is on the way. Tap to view tracking."
    }
  },
  ORDER_DELIVERED: {
    EMAIL: {
      enabled: true,
      subject: "Order {{order_number}} was delivered",
      message:
        "Hi {{customer_name}},\n\nYour order {{order_number}} was delivered on {{delivered_at}}.\nIf you need help, reach us at {{support_phone}}."
    },
    SMS: {
      enabled: true,
      message: "Order {{order_number}} delivered on {{delivered_at}}. Need help? {{support_phone}}"
    },
    WHATSAPP: {
      enabled: true,
      message: "Hello {{customer_name}}, order {{order_number}} was delivered on {{delivered_at}}. Support: {{support_phone}}"
    },
    PUSH: {
      enabled: true,
      subject: "Order delivered",
      message: "Order {{order_number}} has been delivered."
    }
  },
  RETURN_REQUEST: {
    EMAIL: {
      enabled: true,
      subject: "We received your return request for {{order_number}}",
      message:
        "Hi {{customer_name}},\n\nWe received your return request for order {{order_number}}.\nReason: {{return_reason}}\nPickup window: {{pickup_window}}\n\nOur team will guide you through the next steps."
    },
    SMS: {
      enabled: true,
      message: "Return request received for order {{order_number}}. Pickup window: {{pickup_window}}."
    },
    WHATSAPP: {
      enabled: true,
      message: "We received your return request for order {{order_number}}. Pickup window: {{pickup_window}}."
    },
    PUSH: {
      enabled: true,
      subject: "Return request received",
      message: "Your return request for {{order_number}} is being reviewed."
    }
  },
  REFUND_UPDATE: {
    EMAIL: {
      enabled: true,
      subject: "Refund update for order {{order_number}}",
      message:
        "Hi {{customer_name}},\n\nThere is an update on your refund for order {{order_number}}.\nAmount: {{refund_amount}}\nStatus: {{refund_status}}\n\nWe will notify you again when the next step is completed."
    },
    SMS: {
      enabled: true,
      message: "Refund update for {{order_number}}: {{refund_status}} for {{refund_amount}}."
    },
    WHATSAPP: {
      enabled: true,
      message: "Refund update for order {{order_number}}: {{refund_status}}. Amount: {{refund_amount}}."
    },
    PUSH: {
      enabled: true,
      subject: "Refund update",
      message: "Refund status for {{order_number}}: {{refund_status}}."
    }
  },
  ENQUIRY_REPLY: {
    EMAIL: {
      enabled: true,
      subject: "Reply to your {{enquiry_type}} enquiry",
      message:
        "Hi {{customer_name}},\n\n{{agent_name}} has replied to your {{enquiry_type}} enquiry.\nIf you need anything else, reply to this email or reach us at {{support_email}}."
    },
    SMS: {
      enabled: false,
      message: "Your {{enquiry_type}} enquiry has been answered. Check your email for full details."
    },
    WHATSAPP: {
      enabled: true,
      message: "Hello {{customer_name}}, {{agent_name}} has replied to your {{enquiry_type}} enquiry."
    },
    PUSH: {
      enabled: true,
      subject: "Enquiry reply",
      message: "Your {{enquiry_type}} enquiry has a new reply."
    }
  },
  OTP_LOGIN: {
    EMAIL: {
      enabled: true,
      subject: "Your login code for {{app_name}}",
      message:
        "Hi {{customer_name}},\n\nYour one-time code is {{otp_code}}.\nIt expires in {{expiry_minutes}} minutes.\nIf this was not you, please ignore this email."
    },
    SMS: {
      enabled: true,
      message: "{{app_name}} login OTP: {{otp_code}}. Valid for {{expiry_minutes}} minutes. Do not share this code."
    },
    WHATSAPP: {
      enabled: false,
      message: "{{app_name}} login OTP: {{otp_code}}. Valid for {{expiry_minutes}} minutes."
    },
    PUSH: {
      enabled: false,
      subject: "Login verification",
      message: "Use code {{otp_code}} to complete your login."
    }
  }
};

function readTemplates(): NotificationTemplatesState {
  if (typeof window === "undefined") {
    return defaultTemplates;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultTemplates;
  }

  try {
    return {
      ...defaultTemplates,
      ...(JSON.parse(raw) as NotificationTemplatesState)
    };
  } catch {
    return defaultTemplates;
  }
}

function fillPreview(message: string, subject?: string) {
  const tokens: Record<string, string> = {
    "{{customer_name}}": "Aarav",
    "{{order_number}}": "VR-10428",
    "{{order_total}}": "₹42,500",
    "{{store_name}}": "Hyderabad Warehouse",
    "{{tracking_number}}": "TRK938473",
    "{{tracking_url}}": "https://track.example/VR-10428",
    "{{delivered_at}}": "20 May 2026, 3:45 PM",
    "{{support_phone}}": "+91 98765 43210",
    "{{return_reason}}": "Damaged item",
    "{{pickup_window}}": "Tomorrow between 10 AM and 1 PM",
    "{{refund_amount}}": "₹4,500",
    "{{refund_status}}": "Processed",
    "{{enquiry_type}}": "product pricing",
    "{{agent_name}}": "Priya",
    "{{support_email}}": "support@vrtech.in",
    "{{otp_code}}": "418926",
    "{{expiry_minutes}}": "10",
    "{{app_name}}": "VR Technologies"
  };

  const replaceTokens = (value: string) =>
    Object.entries(tokens).reduce((current, [token, replacement]) => current.split(token).join(replacement), value);

  return {
    subject: subject ? replaceTokens(subject) : undefined,
    message: replaceTokens(message)
  };
}

export function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplatesState>(() => readTemplates());
  const [activeEvent, setActiveEvent] = useState<NotificationEventKey>("ORDER_PLACED");
  const [activeChannel, setActiveChannel] = useState<NotificationChannel>("EMAIL");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  }, [templates]);

  const eventDefinition = eventDefinitions.find((item) => item.key === activeEvent) ?? eventDefinitions[0];
  const channelDefinition = channelMeta[activeChannel];
  const currentTemplate = templates[activeEvent][activeChannel];
  const preview = fillPreview(currentTemplate.message, currentTemplate.subject);

  const enabledCount = useMemo(() => {
    return Object.values(templates).reduce((count, channelMap) => {
      return count + Object.values(channelMap).filter((template) => template.enabled).length;
    }, 0);
  }, [templates]);

  const totalTemplateCount = eventDefinitions.length * Object.keys(channelMeta).length;
  const channelCompletion = useMemo(() => {
    return (Object.keys(channelMeta) as NotificationChannel[]).map((channel) => ({
      channel,
      enabled: eventDefinitions.filter((event) => templates[event.key][channel].enabled).length
    }));
  }, [templates]);

  function updateTemplate(patch: Partial<ChannelTemplate>) {
    setTemplates((current) => ({
      ...current,
      [activeEvent]: {
        ...current[activeEvent],
        [activeChannel]: {
          ...current[activeEvent][activeChannel],
          ...patch
        }
      }
    }));
  }

  function handleSave() {
    toast.success(`${eventDefinition.label} template saved for ${channelDefinition.label}`);
  }

  function handleResetCurrent() {
    setTemplates((current) => ({
      ...current,
      [activeEvent]: {
        ...current[activeEvent],
        [activeChannel]: { ...defaultTemplates[activeEvent][activeChannel] }
      }
    }));
    toast.success("Channel template reset to default");
  }

  function handleResetAll() {
    setTemplates(defaultTemplates);
    toast.success("All notification templates reset");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messaging Control"
        title="Notification Templates"
        description="Edit customer-facing messages for order, return, refund, enquiry, and login events across email, SMS, WhatsApp, and push."
        variant="premium"
        actions={
          <button type="button" className="admin-button-secondary rounded-2xl px-5 py-3 text-sm font-bold" onClick={handleResetAll}>
            Reset all defaults
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Template matrix" value={`${eventDefinitions.length} x ${Object.keys(channelMeta).length}`} meta="Events and channels" icon={<Sparkles className="h-5 w-5" />} variant="glass" />
          <StatCard label="Enabled templates" value={String(enabledCount)} meta={`Out of ${totalTemplateCount} channel templates`} icon={<Check className="h-5 w-5" />} variant="glass" />
          <StatCard label="Coverage" value={`${Math.round((enabledCount / totalTemplateCount) * 100)}%`} meta="Templates active across the system" icon={<Zap className="h-5 w-5" />} variant="glass" />
          <StatCard label="Active editor" value={channelDefinition.label} meta={eventDefinition.label} icon={<PencilLine className="h-5 w-5" />} variant="glass" />
        </div>
      </PageHeader>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="admin-card-elevated border-none bg-white p-5 shadow-2xl dark:bg-slate-900">
          <div>
            <div className="admin-section-label">Event templates</div>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Customer notification events</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose the event first, then edit how each delivery channel should speak to the customer.</p>
          </div>

          <div className="mt-4 space-y-3">
            {eventDefinitions.map((event) => {
              const selected = event.key === activeEvent;
              const eventEnabledCount = (Object.keys(channelMeta) as NotificationChannel[]).filter((channel) => templates[event.key][channel].enabled).length;

              return (
                <button
                  key={event.key}
                  type="button"
                  onClick={() => setActiveEvent(event.key)}
                  className={cn(
                    "w-full rounded-[22px] border p-4 text-left transition",
                    selected ? "border-blue-200 bg-blue-50 text-[#1E63F2]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{event.label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">{event.description}</div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">{eventEnabledCount}/4</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-5">
          <section className="admin-card-elevated border-none bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="admin-section-label">Channel editor</div>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{eventDefinition.label}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{eventDefinition.description}</p>
              </div>

              <label className="admin-check-card min-w-[230px] cursor-pointer !p-4 text-sm">
                <input type="checkbox" checked={currentTemplate.enabled} onChange={(event) => updateTemplate({ enabled: event.target.checked })} />
                Enable {channelDefinition.label} for this event
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(Object.keys(channelMeta) as NotificationChannel[]).map((channel) => {
                const meta = channelMeta[channel];
                const selected = channel === activeChannel;
                const enabled = templates[activeEvent][channel].enabled;

                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setActiveChannel(channel)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition",
                      selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {meta.icon}
                    {meta.label}
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {enabled ? "On" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                {channelDefinition.supportsSubject ? (
                  <label className="block">
                    <span className="admin-section-label">Subject / title</span>
                    <input
                      className="admin-input mt-1"
                      value={currentTemplate.subject ?? ""}
                      onChange={(event) => updateTemplate({ subject: event.target.value })}
                      placeholder={activeChannel === "PUSH" ? "Short push title" : "Email subject"}
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="admin-section-label">Message body</span>
                  <textarea
                    className="admin-textarea mt-1 min-h-[260px]"
                    value={currentTemplate.message}
                    onChange={(event) => updateTemplate({ message: event.target.value })}
                    placeholder="Write the customer-facing message here"
                  />
                </label>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="admin-section-label">Available variables</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {eventDefinition.variables.map((token) => (
                      <button
                        key={token}
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-[#1E63F2]"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(token);
                            toast.success(`${token} copied`);
                          } catch {
                            toast.error("Clipboard access is unavailable");
                          }
                        }}
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" className="admin-button rounded-2xl px-5 py-3 text-sm font-black" onClick={handleSave}>
                    Save template
                  </button>
                  <button type="button" className="admin-button-secondary rounded-2xl px-5 py-3 text-sm font-bold" onClick={handleResetCurrent}>
                    Reset this channel
                  </button>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", channelDefinition.tone)}>{channelDefinition.icon}</span>
                    <div>
                      <div className="admin-section-label">{channelDefinition.previewLabel}</div>
                      <div className="mt-1 text-base font-black text-slate-950">{eventDefinition.label}</div>
                    </div>
                  </div>

                  {channelDefinition.supportsSubject && preview.subject ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Subject</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{preview.subject}</div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Rendered message</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.message}</div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="admin-section-label">Channel coverage</div>
                  <div className="mt-4 space-y-3">
                    {channelCompletion.map((item) => (
                      <div key={item.channel} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <span className="font-semibold text-slate-700">{channelMeta[item.channel].label}</span>
                        <span className="font-black text-slate-950">{item.enabled}/{eventDefinitions.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
