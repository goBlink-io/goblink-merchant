"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#2563EB", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316",
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function RevenueLineChart({
  data,
  dataKey = "revenue",
  label = "Revenue",
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  label?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
        <Tooltip
          content={<ChartTooltip formatter={(v) => `$${v.toLocaleString()}`} />}
        />
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <Line
          type="monotone"
          dataKey={dataKey}
          name={label}
          stroke="url(#revenueGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#7C3AED" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VolumeLineChart({
  data,
}: {
  data: Array<Record<string, string | number>>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
        <Tooltip content={<ChartTooltip formatter={(v) => `$${v.toLocaleString()}`} />} />
        <Line type="monotone" dataKey="volume" name="Volume" stroke="#2563EB" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  data,
}: {
  data: Array<Record<string, string | number>>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="count"
          nameKey="status"
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          formatter={(value: string) => <span className="text-zinc-300 text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({
  data,
  dataKey,
  nameKey,
  label,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey: string;
  label: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis type="number" stroke="#71717a" fontSize={12} />
        <YAxis
          type="category"
          dataKey={nameKey}
          stroke="#71717a"
          fontSize={12}
          width={80}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey={dataKey} name={label} fill="#2563EB" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VerticalBarChart({
  data,
  dataKey,
  nameKey,
  label,
  formatter,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey: string;
  label: string;
  formatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={nameKey} stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={formatter} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Bar dataKey={dataKey} name={label} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MerchantsPerWeekChart({
  data,
}: {
  data: Array<Record<string, string | number>>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="week"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="New Merchants" fill="#7C3AED" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
