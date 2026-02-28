import { Badge } from "@/components/ui/badge";

type StatusCategory = "success" | "client_error" | "server_error" | "timeout" | "pending";

function categorize(status: number | null): StatusCategory {
  if (status === null) return "pending";
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500) return "server_error";
  return "pending";
}

const config: Record<StatusCategory, { label: string; className: string }> = {
  success: {
    label: "",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  client_error: {
    label: "",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  server_error: {
    label: "",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  timeout: {
    label: "Timeout",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  pending: {
    label: "Pending",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

interface StatusBadgeProps {
  status: number | null;
  responseBody?: string | null;
  className?: string;
}

export function StatusBadge({ status, responseBody, className }: StatusBadgeProps) {
  let category = categorize(status);

  // Detect timeout from response body
  if (status === null && responseBody?.toLowerCase().includes("abort")) {
    category = "timeout";
  }

  const { className: badgeClass } = config[category];
  const label = status !== null ? String(status) : config[category].label;

  return (
    <Badge variant="outline" className={`text-xs font-mono ${badgeClass} ${className ?? ""}`}>
      {label}
    </Badge>
  );
}
