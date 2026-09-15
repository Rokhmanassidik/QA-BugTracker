"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUG_PRIORITIES, BUG_SEVERITIES, BUG_STATUSES } from "@/types/database";

export function BugFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="bug-search" className="text-xs text-muted-foreground">
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="bug-search"
            placeholder="Search by title..."
            defaultValue={searchParams.get("q") || ""}
            className="w-56 pl-8"
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          defaultValue={searchParams.get("status") || "all"}
          onValueChange={(v) => setParam("status", v || "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BUG_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Priority</Label>
        <Select
          defaultValue={searchParams.get("priority") || "all"}
          onValueChange={(v) => setParam("priority", v || "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {BUG_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Severity</Label>
        <Select
          defaultValue={searchParams.get("severity") || "all"}
          onValueChange={(v) => setParam("severity", v || "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {BUG_SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
