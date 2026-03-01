"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface OfframpProviderCardProps {
  name: string;
  icon: LucideIcon;
  description: string;
  features: string[];
  recommended?: boolean;
  region: string;
  actionLabel: string;
  onSelect: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function OfframpProviderCard({
  name,
  icon: Icon,
  description,
  features,
  recommended,
  region,
  actionLabel,
  onSelect,
  disabled,
  children,
}: OfframpProviderCardProps) {
  return (
    <Card className="p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{name}</h3>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {recommended && (
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-xs">
              Recommended
            </Badge>
          )}
          <Badge
            variant="outline"
            className="text-xs text-zinc-400 border-zinc-700"
          >
            {region}
          </Badge>
        </div>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feature, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-zinc-300"
          >
            <span className="text-blue-400 mt-0.5 shrink-0">&#8226;</span>
            {feature}
          </li>
        ))}
      </ul>

      {children}

      {!children && (
        <Button
          onClick={onSelect}
          disabled={disabled}
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </Card>
  );
}
