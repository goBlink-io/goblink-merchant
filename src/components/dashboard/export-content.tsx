"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, Calculator, Clock } from "lucide-react";

interface ExportRecord {
  type: string;
  format: string;
  date: string;
  range: string;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function saveExportHistory(record: ExportRecord) {
  try {
    const key = "goblink_export_history";
    const existing: ExportRecord[] = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    existing.unshift(record);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 5)));
  } catch {
    // Ignore localStorage errors
  }
}

function loadExportHistory(): ExportRecord[] {
  try {
    return JSON.parse(localStorage.getItem("goblink_export_history") || "[]");
  } catch {
    return [];
  }
}

function ExportCard({
  title,
  description,
  icon: Icon,
  endpoint,
  type,
}: {
  title: string;
  description: string;
  icon: typeof FileSpreadsheet;
  endpoint: string;
  type: string;
}) {
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [format, setFormat] = useState("csv");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        format,
      });

      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ||
        `export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveExportHistory({
        type,
        format,
        date: new Date().toISOString(),
        range: `${startDate} to ${endDate}`,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="[color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="[color-scheme:dark]"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} disabled={loading} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {loading ? "Exporting..." : "Download"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExportContent() {
  const [history, setHistory] = useState<ExportRecord[]>([]);

  useEffect(() => {
    setHistory(loadExportHistory());
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <ExportCard
          title="Transaction Export"
          description="Download all payment transactions for a date range."
          icon={FileSpreadsheet}
          endpoint="/api/v1/internal/export/payments"
          type="Transactions"
        />
        <ExportCard
          title="Tax Summary"
          description="Revenue, fees, and refunds aggregated by month."
          icon={Calculator}
          endpoint="/api/v1/internal/export/tax-summary"
          type="Tax Summary"
        />
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-400" />
              Recent Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((record, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-white">{record.type}</p>
                    <p className="text-xs text-zinc-500">{record.range}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400 uppercase text-xs">
                      {record.format}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
