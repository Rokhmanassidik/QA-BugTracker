import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge, SeverityBadge, StatusBadge } from "@/components/bug-badges";
import { BugFilters } from "./bug-filters";
import { BUG_STATUSES, type Bug, type BugStatus, type Profile } from "@/types/database";

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function pageHref(
  params: { status?: string; priority?: string; severity?: string; q?: string },
  page: number,
) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.priority) sp.set("priority", params.priority);
  if (params.severity) sp.set("severity", params.severity);
  if (params.q) sp.set("q", params.q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    severity?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { status, priority, severity, q, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("bugs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (severity) query = query.eq("severity", severity);
  if (q) query = query.ilike("title", `%${q}%`);

  const [{ data: bugs, count }, { data: profiles }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from("profiles").select("*"),
    supabase.from("bugs").select("status"),
  ]);

  const profileMap = new Map(
    ((profiles as Profile[]) || []).map((p) => [p.id, p]),
  );

  const statusCounts = new Map<BugStatus, number>();
  for (const row of (allStatuses as { status: BugStatus }[]) || []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
  }
  const totalBugs = (allStatuses || []).length;
  const matchingCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));
  const filterParams = { status, priority, severity, q };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-xl font-medium tracking-tight">Bug Reports</h1>
        <Button
          nativeButton={false}
          render={
            <Link href="/bugs/new">
              <Plus className="size-4" />
              New Bug Report
            </Link>
          }
        />
      </div>

      <div className="mb-8 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y py-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-medium tabular-nums">{totalBugs}</span>
          <span className="text-sm text-muted-foreground">All</span>
        </div>
        {BUG_STATUSES.filter((s) => s !== "Reopened").map((s) => (
          <div key={s} className="flex items-baseline gap-1.5">
            <span className="text-2xl font-medium tabular-nums">
              {statusCounts.get(s) || 0}
            </span>
            <span className="text-sm text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <BugFilters />
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">No</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Reporter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {((bugs as Bug[]) || []).map((bug, index) => {
              const assignee = bug.assignee_id ? profileMap.get(bug.assignee_id) : null;
              const reporter = bug.reporter_id ? profileMap.get(bug.reporter_id) : null;
              return (
                <TableRow key={bug.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {from + index + 1}
                  </TableCell>
                  <TableCell className="max-w-xs font-medium">
                    <Link
                      href={`/bugs/${bug.id}`}
                      className="line-clamp-1 hover:underline"
                    >
                      {bug.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={bug.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge value={bug.priority} />
                  </TableCell>
                  <TableCell>
                    <SeverityBadge value={bug.severity} />
                  </TableCell>
                  <TableCell>
                    {bug.assignee_team ? (
                      <span className="text-sm">Team: {bug.assignee_team}</span>
                    ) : assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[0.6rem]">
                            {initials(assignee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reporter?.full_name || "-"}
                  </TableCell>
                </TableRow>
              );
            })}
            {!bugs || bugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="size-8" />
                    <p className="text-sm">No bugs match these filters yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        {matchingCount > 0 ? (
          <div className="flex items-center justify-between border-t px-1 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {from + 1}–{Math.min(from + PAGE_SIZE, matchingCount)} of {matchingCount}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={pageHref(filterParams, page - 1)}><ChevronLeft className="size-4" />Previous</Link>}
                />
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={pageHref(filterParams, page + 1)}>Next<ChevronRight className="size-4" /></Link>}
                />
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
