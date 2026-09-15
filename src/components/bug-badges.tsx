import { cn } from "@/lib/utils";
import type { BugPriority, BugSeverity, BugStatus } from "@/types/database";

const DOT_COLORS: Record<string, string> = {
  Low: "bg-muted-foreground/40",
  Medium: "bg-blue-500",
  High: "bg-orange-500",
  Critical: "bg-red-500",
  Minor: "bg-muted-foreground/40",
  Major: "bg-amber-500",
  Blocker: "bg-red-500",
  Open: "bg-sky-500",
  "In Progress": "bg-violet-500",
  Resolved: "bg-green-500",
  Closed: "bg-muted-foreground/40",
  Reopened: "bg-red-500",
};

function StatusDot({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_COLORS[value])} />
      {value}
    </span>
  );
}

export function PriorityBadge({ value }: { value: BugPriority }) {
  return <StatusDot value={value} />;
}

export function SeverityBadge({ value }: { value: BugSeverity }) {
  return <StatusDot value={value} />;
}

export function StatusBadge({ value }: { value: BugStatus }) {
  return <StatusDot value={value} />;
}
