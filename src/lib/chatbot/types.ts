export type KBCategory =
  | "getting-started"
  | "payments"
  | "wallet"
  | "settings"
  | "integrations"
  | "fees"
  | "security"
  | "troubleshooting";

export type ActionType =
  | "link_to_settings"
  | "link_to_payments"
  | "link_to_support"
  | "link_to_payment_links"
  | "create_ticket"
  | "check_payments"
  | "check_wallet"
  | "check_webhooks"
  | "check_errors";

export interface KBEntry {
  id: string;
  category: KBCategory;
  keywords: string[];
  question: string;
  answer: string;
  followUp?: string[];
  action?: ActionType;
}

export interface MatchResult {
  entry: KBEntry;
  score: number;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  action?: { type: string; url?: string };
  createTicket?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  suggestions?: string[];
  action?: { type: string; url?: string };
  createTicket?: boolean;
  timestamp: Date;
}
