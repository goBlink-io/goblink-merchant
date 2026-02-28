import { Badge } from "@/components/ui/badge";

const eventColors: Record<string, string> = {
  "payment.created": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "payment.processing": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "payment.confirmed": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "payment.failed": "bg-red-500/15 text-red-400 border-red-500/30",
  "payment.expired": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "payment.refunded": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "payment.partially_refunded": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "refund.created": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "test.webhook": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const fallback = "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";

interface EventBadgeProps {
  event: string;
  className?: string;
}

export function EventBadge({ event, className }: EventBadgeProps) {
  const colorClass = eventColors[event] ?? fallback;
  return (
    <Badge variant="outline" className={`text-xs ${colorClass} ${className ?? ""}`}>
      {event}
    </Badge>
  );
}
