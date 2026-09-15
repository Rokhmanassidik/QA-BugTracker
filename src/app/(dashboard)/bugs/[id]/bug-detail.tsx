"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EvidenceFilePicker,
  type EvidenceFilePickerHandle,
} from "@/components/evidence-file-picker";
import { PriorityBadge, SeverityBadge } from "@/components/bug-badges";
import { BugComments } from "./bug-comments";
import {
  addEvidence,
  assignBug,
  deleteBug,
  deleteEvidence,
  updateBugFields,
  updateBugStatus,
} from "../actions";
import {
  BUG_PRIORITIES,
  BUG_SEVERITIES,
  BUG_STATUSES,
  type Bug,
  type BugComment,
  type BugPriority,
  type BugSeverity,
  type BugStatus,
  type Profile,
} from "@/types/database";

interface EvidenceWithUrl {
  id: string;
  bug_id: string;
  file_path: string;
  file_type: "image" | "video";
  file_name: string;
  url: string | null;
}

const PHOTO_PREVIEW_LIMIT = 6;
const VIDEO_PREVIEW_LIMIT = 4;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-sm font-medium text-muted-foreground">{children}</h2>;
}

function AddEvidenceButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
      {pending ? "Uploading..." : "Add Evidence"}
    </Button>
  );
}

export function BugDetail({
  bug,
  profiles,
  evidence,
  comments,
  currentUserId,
}: {
  bug: Bug;
  profiles: Profile[];
  evidence: EvidenceWithUrl[];
  comments: BugComment[];
  currentUserId: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const evidencePickerRef = useRef<EvidenceFilePickerHandle>(null);
  const [fields, setFields] = useState({
    title: bug.title,
    description: bug.description,
    priority: bug.priority,
    severity: bug.severity,
    steps_to_reproduce: bug.steps_to_reproduce || "",
    actual_result: bug.actual_result || "",
    expected_result: bug.expected_result || "",
  });

  const photos = evidence.filter((item) => item.file_type === "image");
  const videos = evidence.filter((item) => item.file_type === "video");
  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW_LIMIT);
  const visibleVideos = showAllVideos ? videos : videos.slice(0, VIDEO_PREVIEW_LIMIT);
  const reporter = profiles.find((p) => p.id === bug.reporter_id) || null;

  function showPrevPhoto() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }

  function showNextPhoto() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }

  function handleDelete() {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteBug(bug.id);
      if (result?.error) {
        toast.error(result.error);
        setIsDeleting(false);
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateBugFields(bug.id, fields);
        toast.success("Bug report updated.");
        setIsEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update bug.");
      }
    });
  }

  function handleStatusChange(status: string | null) {
    if (!status) return;
    startTransition(async () => {
      try {
        await updateBugStatus(bug.id, status as BugStatus);
        toast.success(`Status changed to ${status}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      }
    });
  }

  function handleAssigneeChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await assignBug(bug.id, value === "unassigned" ? null : value);
        toast.success("Assignee updated.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign bug.");
      }
    });
  }

  async function handleUploadEvidence(formData: FormData) {
    try {
      await addEvidence(bug.id, formData);
      toast.success("Evidence added.");
      evidencePickerRef.current?.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload evidence.");
    }
  }

  function handleDeleteEvidence(item: EvidenceWithUrl) {
    startTransition(async () => {
      try {
        await deleteEvidence(item.id, bug.id, item.file_path);
        toast.success("Evidence deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete evidence.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to bugs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          {isEditing ? (
            <Input
              value={fields.title}
              onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
              className="text-lg font-medium"
            />
          ) : (
            <h1 className="text-xl font-medium tracking-tight">{bug.title}</h1>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {reporter ? (
              <Avatar className="size-5">
                <AvatarFallback className="text-[0.6rem] font-normal">
                  {initials(reporter.full_name)}
                </AvatarFallback>
              </Avatar>
            ) : null}
            <span>
              Reported by {reporter?.full_name || "Unknown"} &middot;{" "}
              {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isPending}>
                <Check className="size-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-4 border-y py-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={bug.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUG_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          {isEditing ? (
            <Select
              value={fields.priority}
              onValueChange={(v) =>
                setFields((f) => ({ ...f, priority: v as BugPriority }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUG_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 items-center">
              <PriorityBadge value={bug.priority} />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Severity</Label>
          {isEditing ? (
            <Select
              value={fields.severity}
              onValueChange={(v) =>
                setFields((f) => ({ ...f, severity: v as BugSeverity }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUG_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 items-center">
              <SeverityBadge value={bug.severity} />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          <Select
            value={bug.assignee_id || "unassigned"}
            onValueChange={handleAssigneeChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {(value: string) => {
                  if (value === "unassigned") return "Unassigned";
                  const assignee = profiles.find((p) => p.id === value);
                  return assignee ? `${assignee.full_name} (${assignee.role})` : "Unassigned";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-8 divide-y">
        <section>
          <SectionLabel>Description</SectionLabel>
          {isEditing ? (
            <Textarea
              rows={3}
              value={fields.description}
              onChange={(e) =>
                setFields((f) => ({ ...f, description: e.target.value }))
              }
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{bug.description}</p>
          )}
        </section>

        <section className="pt-8">
          <SectionLabel>Steps to Reproduce</SectionLabel>
          {isEditing ? (
            <Textarea
              rows={4}
              value={fields.steps_to_reproduce}
              onChange={(e) =>
                setFields((f) => ({ ...f, steps_to_reproduce: e.target.value }))
              }
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {bug.steps_to_reproduce || "-"}
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-2">
          <div>
            <SectionLabel>Actual Result</SectionLabel>
            {isEditing ? (
              <Textarea
                rows={3}
                value={fields.actual_result}
                onChange={(e) =>
                  setFields((f) => ({ ...f, actual_result: e.target.value }))
                }
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">
                {bug.actual_result || "-"}
              </p>
            )}
          </div>
          <div>
            <SectionLabel>Expected Result</SectionLabel>
            {isEditing ? (
              <Textarea
                rows={3}
                value={fields.expected_result}
                onChange={(e) =>
                  setFields((f) => ({ ...f, expected_result: e.target.value }))
                }
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">
                {bug.expected_result || "-"}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6 pt-8">
          <SectionLabel>Evidence</SectionLabel>

          {photos.length === 0 && videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence attached yet.</p>
          ) : null}

          {photos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Photos ({photos.length})</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {visiblePhotos.map((item, index) => (
                  <div key={item.id} className="space-y-1">
                    {item.url ? (
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.file_name}
                          className="aspect-video w-full cursor-zoom-in rounded-md border object-cover transition hover:opacity-90"
                        />
                      </button>
                    ) : (
                      <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border text-xs text-muted-foreground">
                        <ImageOff className="size-4" />
                        Failed to load
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {item.file_name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(item)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {photos.length > PHOTO_PREVIEW_LIMIT ? (
                <button
                  type="button"
                  onClick={() => setShowAllPhotos((v) => !v)}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {showAllPhotos ? "Show less" : `Show all ${photos.length} photos`}
                </button>
              ) : null}
            </div>
          ) : null}

          {videos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Videos ({videos.length})</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {visibleVideos.map((item) => (
                  <div key={item.id} className="space-y-1">
                    {item.url ? (
                      <video
                        src={item.url}
                        controls
                        className="aspect-video w-full rounded-md border"
                      />
                    ) : (
                      <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border text-xs text-muted-foreground">
                        <ImageOff className="size-4" />
                        Failed to load
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {item.file_name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvidence(item)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {videos.length > VIDEO_PREVIEW_LIMIT ? (
                <button
                  type="button"
                  onClick={() => setShowAllVideos((v) => !v)}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {showAllVideos ? "Show less" : `Show all ${videos.length} videos`}
                </button>
              ) : null}
            </div>
          ) : null}

          <form action={handleUploadEvidence} className="space-y-3">
            <EvidenceFilePicker ref={evidencePickerRef} compact />
            <AddEvidenceButton />
          </form>
        </section>

        <section className="pt-8">
          <SectionLabel>Comments</SectionLabel>
          <BugComments
            bugId={bug.id}
            comments={comments}
            profiles={profiles}
            currentUserId={currentUserId}
          />
        </section>
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => setLightboxIndex(open ? lightboxIndex : null)}
      >
        <DialogContent
          showCloseButton
          className="max-w-4xl border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">
            {lightboxIndex !== null ? photos[lightboxIndex]?.file_name : "Photo preview"}
          </DialogTitle>
          {lightboxIndex !== null && photos[lightboxIndex]?.url ? (
            <div className="relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[lightboxIndex].url!}
                alt={photos[lightboxIndex].file_name}
                className="max-h-[85vh] w-full rounded-lg object-contain"
              />
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrevPhoto}
                    className="absolute left-2 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextPhoto}
                    className="absolute right-2 flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2.5 py-1 text-xs backdrop-blur-sm">
                    {lightboxIndex + 1} / {photos.length}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this bug report?</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{bug.title}&quot;, including its evidence and
              comments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {isDeleting ? "Deleting..." : "Delete Bug"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
