"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addComment } from "../actions";
import type { BugComment, Profile } from "@/types/database";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function BugComments({
  bugId,
  comments,
  profiles,
  currentUserId,
}: {
  bugId: string;
  comments: BugComment[];
  profiles: Profile[];
  currentUserId: string | null;
}) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const currentUser = profiles.find((p) => p.id === currentUserId) || null;

  function submit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addComment(bugId, trimmed);
        setContent("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to post comment.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => {
            const author = profiles.find((p) => p.id === comment.author_id) || null;
            return (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {author ? initials(author.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {author?.full_name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 border-t pt-5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">
            {currentUser ? initials(currentUser.full_name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            rows={2}
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={isPending || !content.trim()}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {isPending ? "Posting..." : "Comment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
