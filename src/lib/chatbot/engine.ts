import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatResponse, ActionType } from "./types";
import { findBestMatch, getCategorySuggestions } from "./matcher";
import { enrichResponse } from "./context";
import { runHandler } from "./handlers";
import { knowledgeBase } from "./knowledge-base";

/** Map action types to navigation URLs */
function getActionUrl(action: ActionType): { type: string; url?: string } | undefined {
  switch (action) {
    case "link_to_settings":
      return { type: "navigate", url: "/dashboard/settings" };
    case "link_to_payments":
      return { type: "navigate", url: "/dashboard/payments" };
    case "link_to_support":
      return { type: "navigate", url: "/dashboard/support" };
    case "link_to_payment_links":
      return { type: "navigate", url: "/dashboard/links" };
    case "create_ticket":
      return { type: "create_ticket", url: "/dashboard/support" };
    default:
      return undefined;
  }
}

/** Resolve follow-up IDs to question text for suggestion chips */
function resolveFollowUps(followUpIds: string[]): string[] {
  return followUpIds
    .map((id) => {
      const entry = knowledgeBase.find((e) => e.id === id);
      return entry?.question ?? null;
    })
    .filter((q): q is string => q !== null);
}

/** Process a user message and return a chatbot response */
export async function processMessage(
  input: string,
  merchantId: string,
  supabase: SupabaseClient
): Promise<ChatResponse> {
  // 1. Match intent
  const matches = findBestMatch(input);

  // 2. No match — suggest topics
  if (matches.length === 0) {
    const suggestions = getCategorySuggestions();
    return {
      message:
        "I couldn't find a specific answer for that. Here are some topics I can help with, or you can create a support ticket for personalized help.",
      suggestions,
      createTicket: true,
    };
  }

  const bestMatch = matches[0];
  const entry = bestMatch.entry;

  // 3. Enrich answer with merchant context
  let message = await enrichResponse(entry.answer, merchantId, supabase);

  // 4. Run dynamic handler if action is a data-fetching action
  const dataActions = ["check_payments", "check_wallet", "check_webhooks", "check_errors"];
  if (entry.action && dataActions.includes(entry.action)) {
    const handlerResult = await runHandler(entry.action, merchantId, supabase);
    if (handlerResult) {
      message = handlerResult;
    }
  }

  // 5. Resolve follow-up suggestions
  const suggestions = entry.followUp ? resolveFollowUps(entry.followUp) : undefined;

  // 6. Determine action (navigation or create ticket)
  const action = entry.action ? getActionUrl(entry.action) : undefined;
  const createTicket = entry.action === "create_ticket" || undefined;

  return {
    message,
    suggestions,
    action: createTicket ? undefined : action,
    createTicket,
  };
}
