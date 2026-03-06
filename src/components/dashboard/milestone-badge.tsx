import { MILESTONES } from "@/lib/milestones";

interface MilestoneBadgeProps {
  milestoneKey: string;
}

const MILESTONE_MAP = Object.fromEntries(
  MILESTONES.map((m) => [m.key, { emoji: m.emoji, label: m.label }])
);

export function MilestoneBadge({ milestoneKey }: MilestoneBadgeProps) {
  const info = MILESTONE_MAP[milestoneKey];
  if (!info) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
      <span>{info.emoji}</span>
      {info.label}
    </span>
  );
}
