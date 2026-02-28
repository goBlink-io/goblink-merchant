"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback } from "react";

interface AdminTicketFiltersProps {
  currentStatus: string;
  currentPriority: string;
  currentCategory: string;
  currentAssigned: string;
  currentSearch: string;
}

export function AdminTicketFilters({
  currentStatus,
  currentPriority,
  currentCategory,
  currentAssigned,
  currentSearch,
}: AdminTicketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/admin/tickets?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search tickets..."
        defaultValue={currentSearch}
        className="w-64 bg-zinc-900 border-zinc-700 text-white"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateParams("search", e.currentTarget.value);
          }
        }}
      />

      <Select value={currentStatus} onValueChange={(v) => updateParams("status", v)}>
        <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-200">All Statuses</SelectItem>
          <SelectItem value="open" className="text-zinc-200">Open</SelectItem>
          <SelectItem value="in_progress" className="text-zinc-200">In Progress</SelectItem>
          <SelectItem value="waiting_on_merchant" className="text-zinc-200">Waiting on Merchant</SelectItem>
          <SelectItem value="resolved" className="text-zinc-200">Resolved</SelectItem>
          <SelectItem value="closed" className="text-zinc-200">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentPriority} onValueChange={(v) => updateParams("priority", v)}>
        <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700 text-white">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-200">All Priorities</SelectItem>
          <SelectItem value="low" className="text-zinc-200">Low</SelectItem>
          <SelectItem value="medium" className="text-zinc-200">Medium</SelectItem>
          <SelectItem value="high" className="text-zinc-200">High</SelectItem>
          <SelectItem value="urgent" className="text-zinc-200">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentCategory} onValueChange={(v) => updateParams("category", v)}>
        <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-200">All Categories</SelectItem>
          <SelectItem value="bug" className="text-zinc-200">Bug</SelectItem>
          <SelectItem value="feature_request" className="text-zinc-200">Feature Request</SelectItem>
          <SelectItem value="billing" className="text-zinc-200">Billing</SelectItem>
          <SelectItem value="general" className="text-zinc-200">General</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentAssigned} onValueChange={(v) => updateParams("assigned_to", v)}>
        <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
          <SelectValue placeholder="Assigned" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all" className="text-zinc-200">All</SelectItem>
          <SelectItem value="unassigned" className="text-zinc-200">Unassigned</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
