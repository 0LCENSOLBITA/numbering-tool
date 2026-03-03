import { Badge } from "@/components/ui/badge";

type ProjectStatus = "active" | "on_hold" | "completed";

interface StatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "status-active hover:bg-[hsl(var(--status-active-bg))]",
  },
  on_hold: {
    label: "On Hold",
    className: "status-on-hold hover:bg-[hsl(var(--status-on-hold-bg))]",
  },
  completed: {
    label: "Completed",
    className: "status-completed hover:bg-[hsl(var(--status-completed-bg))]",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
