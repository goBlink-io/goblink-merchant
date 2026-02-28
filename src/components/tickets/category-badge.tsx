import { Badge } from "@/components/ui/badge";
import type { TicketCategory } from "@/lib/tickets/types";

const categoryLabels: Record<TicketCategory, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  billing: "Billing",
  general: "General",
};

const categoryVariants: Record<TicketCategory, "destructive" | "default" | "warning" | "secondary"> = {
  bug: "destructive",
  feature_request: "default",
  billing: "warning",
  general: "secondary",
};

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <Badge variant={categoryVariants[category]}>
      {categoryLabels[category]}
    </Badge>
  );
}
