import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function truncateAddress(address: string, chars: number = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "processing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "failed":
    case "expired":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "refunded":
    case "partially_refunded":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  }
}
