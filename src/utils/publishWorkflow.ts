export type PublishWorkflowStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "SCHEDULED";

export const publishWorkflowOptions: Array<{ label: string; value: PublishWorkflowStatus }> = [
  { label: "Draft", value: "DRAFT" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Unpublished", value: "UNPUBLISHED" },
  { label: "Scheduled", value: "SCHEDULED" }
];

export function resolvePublishWorkflowStatus({
  active,
  startAt,
  endAt,
  inactiveLabel = "DRAFT"
}: {
  active: boolean;
  startAt?: string | null;
  endAt?: string | null;
  inactiveLabel?: "DRAFT" | "UNPUBLISHED";
}): PublishWorkflowStatus {
  if (!active) {
    return inactiveLabel;
  }

  if (startAt && Date.parse(startAt) > Date.now()) {
    return "SCHEDULED";
  }

  if (endAt && Date.parse(endAt) < Date.now()) {
    return "UNPUBLISHED";
  }

  return "PUBLISHED";
}

export function workflowAppearance(status: PublishWorkflowStatus) {
  switch (status) {
    case "DRAFT":
      return { label: "Draft", className: "admin-badge-slate" };
    case "SCHEDULED":
      return { label: "Scheduled", className: "admin-badge-amber" };
    case "UNPUBLISHED":
      return { label: "Unpublished", className: "admin-badge-rose" };
    case "PUBLISHED":
    default:
      return { label: "Published", className: "admin-badge-green" };
  }
}

export function applyWorkflowStatus<T extends { active: boolean; startAt: string; endAt: string }>(
  current: T,
  status: PublishWorkflowStatus,
  defaultScheduledAt = getDefaultScheduledAt()
): T {
  if (status === "DRAFT") {
    return { ...current, active: false };
  }

  if (status === "UNPUBLISHED") {
    return { ...current, active: false };
  }

  if (status === "PUBLISHED") {
    return { ...current, active: true, startAt: "", endAt: current.endAt };
  }

  return {
    ...current,
    active: true,
    startAt: current.startAt || defaultScheduledAt
  };
}

export function getDefaultScheduledAt() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  const year = nextHour.getFullYear();
  const month = String(nextHour.getMonth() + 1).padStart(2, "0");
  const day = String(nextHour.getDate()).padStart(2, "0");
  const hours = String(nextHour.getHours()).padStart(2, "0");
  const minutes = String(nextHour.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
