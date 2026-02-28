"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Loader2,
  ExternalLink,
  TicketPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatResponse } from "@/lib/chatbot/types";

const INITIAL_SUGGESTIONS = [
  "How do I get started?",
  "What are the fees?",
  "How do I set up webhooks?",
  "Show me my recent payments",
  "How do I create a payment link?",
  "What tokens can customers pay with?",
];

let messageIdCounter = 0;
function nextId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

export function ChatWidget({ businessName }: { businessName?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Show greeting when chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      const name = businessName || "there";
      setMessages([
        {
          id: nextId(),
          role: "bot",
          content: `Hi ${name}! I'm your goBlink support assistant. Ask me anything about payments, settings, integrations, or troubleshooting.\n\nHere are some popular topics:`,
          suggestions: INITIAL_SUGGESTIONS,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, hasGreeted, businessName]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Brief delay for natural feel
    await new Promise((r) => setTimeout(r, 300));

    try {
      const res = await fetch("/api/v1/internal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Something went wrong");
      }

      const data: ChatResponse = await res.json();

      const botMsg: ChatMessage = {
        id: nextId(),
        role: "bot",
        content: data.message,
        suggestions: data.suggestions,
        action: data.action,
        createTicket: data.createTicket,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: nextId(),
        role: "bot",
        content:
          err instanceof Error
            ? err.message
            : "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleAction(action: { type: string; url?: string }) {
    if (action.url) {
      router.push(action.url);
      setIsOpen(false);
    }
  }

  function handleCreateTicket() {
    router.push("/dashboard/support");
    setIsOpen(false);
  }

  // Floating bubble when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "h-14 w-14 rounded-full",
          "bg-gradient-to-r from-blue-600 to-violet-600",
          "shadow-lg shadow-blue-500/25",
          "flex items-center justify-center",
          "hover:scale-105 active:scale-95",
          "transition-transform duration-200",
          "lg:bottom-8 lg:right-8"
        )}
        aria-label="Open support chat"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "lg:bottom-8 lg:right-8"
        )}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-full",
            "bg-zinc-900 border border-zinc-700",
            "text-white text-sm font-medium",
            "shadow-lg hover:border-zinc-600",
            "transition-colors duration-200"
          )}
        >
          <MessageCircle className="h-4 w-4 text-blue-400" />
          goBlink Support
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50",
        // Mobile: full width with margins
        "bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto",
        // Desktop: fixed size
        "sm:w-[400px]",
        "flex flex-col",
        "h-[85vh] sm:h-[500px]",
        "bg-zinc-950 border border-zinc-800 sm:rounded-xl",
        "shadow-2xl shadow-black/50",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-white">
            goBlink Support
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id}>
            {/* Message bubble */}
            <div
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                )}
              >
                <MarkdownContent content={msg.content} />
              </div>
            </div>

            {/* Action button */}
            {msg.action && (
              <div className="mt-2 ml-1">
                <button
                  onClick={() => handleAction(msg.action!)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                    "bg-blue-600/10 text-blue-400 text-xs font-medium",
                    "border border-blue-500/20",
                    "hover:bg-blue-600/20 transition-colors"
                  )}
                >
                  <ExternalLink className="h-3 w-3" />
                  {msg.action.type === "navigate" ? "Go to page" : "View"}
                </button>
              </div>
            )}

            {/* Create ticket button */}
            {msg.createTicket && (
              <div className="mt-2 ml-1">
                <button
                  onClick={handleCreateTicket}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                    "bg-violet-600/10 text-violet-400 text-xs font-medium",
                    "border border-violet-500/20",
                    "hover:bg-violet-600/20 transition-colors"
                  )}
                >
                  <TicketPlus className="h-3 w-3" />
                  Create Support Ticket
                </button>
              </div>
            )}

            {/* Suggestion chips */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-2 ml-1 flex flex-wrap gap-1.5">
                {msg.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs",
                      "bg-zinc-800 text-zinc-300 border border-zinc-700",
                      "hover:bg-zinc-700 hover:text-white hover:border-zinc-600",
                      "transition-colors duration-150"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl px-4 py-2.5 text-sm",
              "bg-zinc-900 border border-zinc-700 text-white",
              "placeholder:text-zinc-500",
              "focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25",
              "max-h-24"
            )}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className={cn(
              "shrink-0 h-10 w-10 rounded-xl",
              "flex items-center justify-center",
              "transition-colors duration-150",
              input.trim() && !isTyping
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple markdown renderer for bot messages */
function MarkdownContent({ content }: { content: string }) {
  // Process markdown into HTML-safe segments
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="bg-zinc-900 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-zinc-300"
          >
            {codeBlockContent.join("\n")}
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());

      // Skip separator rows (|---|---|)
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        inTable = true;
        continue;
      }

      tableRows.push(cells);
      inTable = true;
      continue;
    }

    // End of table
    if (inTable && tableRows.length > 0) {
      elements.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                {tableRows[0].map((cell, ci) => (
                  <th
                    key={ci}
                    className="text-left px-2 py-1 text-zinc-400 font-medium border-b border-zinc-700"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 text-zinc-300 border-b border-zinc-800">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Process inline formatting
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        <InlineFormatted text={line} />
      </p>
    );
  }

  // Flush remaining table
  if (tableRows.length > 0) {
    elements.push(
      <div key="table-end" className="my-2 overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              {tableRows[0].map((cell, ci) => (
                <th
                  key={ci}
                  className="text-left px-2 py-1 text-zinc-400 font-medium border-b border-zinc-700"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(1).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 text-zinc-300 border-b border-zinc-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <>{elements}</>;
}

/** Render inline markdown: **bold**, `code`, - lists */
function InlineFormatted({ text }: { text: string }) {
  // Handle list items
  const listMatch = text.match(/^(\s*)[-*]\s+(.+)/);
  if (listMatch) {
    const indent = listMatch[1].length > 0;
    return (
      <span className={cn("flex gap-1.5", indent && "ml-4")}>
        <span className="text-zinc-500 shrink-0">•</span>
        <span>
          <InlineFormatted text={listMatch[2]} />
        </span>
      </span>
    );
  }

  // Handle numbered lists
  const numberedMatch = text.match(/^(\d+)\.\s+(.+)/);
  if (numberedMatch) {
    return (
      <span className="flex gap-1.5">
        <span className="text-zinc-500 shrink-0 tabular-nums">
          {numberedMatch[1]}.
        </span>
        <span>
          <InlineFormatted text={numberedMatch[2]} />
        </span>
      </span>
    );
  }

  // Process inline formatting (bold, code)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code
          key={match.index}
          className="bg-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono text-blue-400"
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
