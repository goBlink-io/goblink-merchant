export type TicketStatus = "open" | "in_progress" | "waiting_on_merchant" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "bug" | "feature_request" | "billing" | "general";
export type SenderType = "merchant" | "admin";

export interface Ticket {
  id: string;
  merchant_id: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: SenderType;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface TicketWithMessages extends Ticket {
  messages: TicketMessage[];
}

export interface AdminTicket extends Ticket {
  merchant_name?: string;
  merchant_email?: string;
  merchant_country?: string;
  assigned_admin_name?: string;
  last_message_at?: string;
}

export interface AdminTicketDetail extends AdminTicket {
  messages: TicketMessage[];
  related_tickets: Ticket[];
}

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature Request" },
  { value: "billing", label: "Billing" },
  { value: "general", label: "General" },
];

export const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_merchant", label: "Waiting on Merchant" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
