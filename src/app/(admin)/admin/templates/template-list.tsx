"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Send, Loader2 } from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  is_active: boolean;
  updated_at: string;
}

export function TemplateList({ templates }: { templates: EmailTemplate[] }) {
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  async function handleSendTest(e: React.MouseEvent, templateId: string) {
    e.stopPropagation();
    setSendingTest(templateId);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Test email sent to ${data.sentTo}`);
      } else {
        setToast("Failed to send test email");
      }
    } catch {
      setToast("Failed to send test email");
    }
    setSendingTest(null);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and customize all email templates sent to merchants
          </p>
        </div>
      </div>

      {toast && (
        <div className="bg-blue-600/10 border border-blue-600/30 text-blue-400 px-4 py-3 rounded-lg text-sm">
          {toast}
        </div>
      )}

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Name</TableHead>
              <TableHead className="text-zinc-400">Type</TableHead>
              <TableHead className="text-zinc-400">Subject</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Last Updated</TableHead>
              <TableHead className="text-zinc-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow
                key={template.id}
                className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                onClick={() => router.push(`/admin/templates/${template.id}`)}
              >
                <TableCell className="font-medium text-white">
                  {template.name}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                    {template.type}
                  </code>
                </TableCell>
                <TableCell className="text-zinc-300 max-w-[300px] truncate">
                  {template.subject}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      template.is_active
                        ? "bg-green-600/20 text-green-400 border-green-500/30"
                        : "bg-zinc-700/20 text-zinc-400 border-zinc-600/30"
                    }
                  >
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {new Date(template.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-400 hover:text-white"
                    onClick={(e) => handleSendTest(e, template.id)}
                    disabled={sendingTest === template.id}
                  >
                    {sendingTest === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">Test</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
