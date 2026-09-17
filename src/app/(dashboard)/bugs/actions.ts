"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BugPriority,
  BugSeverity,
  BugStatus,
  EvidenceFileType,
  NotificationType,
  UserRole,
} from "@/types/database";

const EVIDENCE_BUCKET = "bug-evidence";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// A bug is assigned either to one person or to a whole team, never both
// (enforced by a DB constraint). Resolves that into the list of profile
// ids who should be notified about activity on the bug.
async function resolveRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bug: { assignee_id: string | null; assignee_team: UserRole | null },
): Promise<string[]> {
  if (bug.assignee_id) return [bug.assignee_id];
  if (bug.assignee_team) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", bug.assignee_team);
    return (data || []).map((p) => p.id);
  }
  return [];
}

// Notifies every recipient about activity on a bug. Never notifies the
// person who caused the activity.
async function notifyRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  recipientIds: string[],
  bugId: string,
  type: NotificationType,
  message: string,
) {
  const targets = [...new Set(recipientIds)].filter((id) => id !== actorId);
  if (targets.length === 0) return;

  await supabase.from("notifications").insert(
    targets.map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: actorId,
      bug_id: bugId,
      type,
      message,
    })),
  );
}

export async function createBug(formData: FormData): Promise<{ bugId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const testCaseId = String(formData.get("test_case_id") || "").trim() || null;
  const priority = String(formData.get("priority") || "Medium") as BugPriority;
  const severity = String(formData.get("severity") || "Minor") as BugSeverity;
  const stepsToReproduce = String(formData.get("steps_to_reproduce") || "");
  const actualResult = String(formData.get("actual_result") || "");
  const expectedResult = String(formData.get("expected_result") || "");
  const aiGenerated = formData.get("ai_generated") === "true";
  const originalReport = String(formData.get("original_report") || "") || null;

  if (!title || !description) {
    throw new Error("Title and description are required.");
  }

  const { data: bug, error } = await supabase
    .from("bugs")
    .insert({
      title,
      description,
      test_case_id: testCaseId,
      priority,
      severity,
      steps_to_reproduce: stepsToReproduce,
      actual_result: actualResult,
      expected_result: expectedResult,
      ai_generated: aiGenerated,
      original_report: originalReport,
      reporter_id: user.id,
      status: "Open" as BugStatus,
    })
    .select("id")
    .single();

  if (error || !bug) {
    throw new Error(`Failed to create bug: ${error?.message}`);
  }

  revalidatePath("/");
  return { bugId: bug.id };
}

// Records evidence that the browser has already uploaded directly to
// Supabase Storage (see src/lib/upload-evidence.ts). No file bytes pass
// through this action, so it isn't subject to server request size limits.
export async function recordEvidence(
  bugId: string,
  files: { path: string; file_type: EvidenceFileType; file_name: string }[],
) {
  if (files.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("bug_evidence").insert(
    files.map((file) => ({
      bug_id: bugId,
      file_path: file.path,
      file_type: file.file_type,
      file_name: file.file_name,
      uploaded_by: user.id,
    })),
  );

  if (error) {
    throw new Error(`Failed to save evidence: ${error.message}`);
  }

  revalidatePath(`/bugs/${bugId}`);
}

export async function deleteEvidence(
  evidenceId: string,
  bugId: string,
  filePath: string,
) {
  const supabase = await createClient();

  await supabase.storage.from(EVIDENCE_BUCKET).remove([filePath]);
  await supabase.from("bug_evidence").delete().eq("id", evidenceId);

  revalidatePath(`/bugs/${bugId}`);
}

export async function deleteBug(bugId: string): Promise<{ error: string } | void> {
  const supabase = await createClient();

  const { data: evidence } = await supabase
    .from("bug_evidence")
    .select("file_path")
    .eq("bug_id", bugId);

  const filePaths = (evidence || []).map((item) => item.file_path);
  if (filePaths.length > 0) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove(filePaths);
  }

  const { error } = await supabase.from("bugs").delete().eq("id", bugId);

  if (error) {
    return { error: `Failed to delete bug: ${error.message}` };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateBugStatus(bugId: string, status: BugStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bug, error } = await supabase
    .from("bugs")
    .update({ status })
    .eq("id", bugId)
    .select("assignee_id, assignee_team, title")
    .single();

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  if (user && bug) {
    const recipients = await resolveRecipients(supabase, bug);
    await notifyRecipients(
      supabase,
      user.id,
      recipients,
      bugId,
      "status_change",
      `${status}: ${truncate(bug.title, 40)}`,
    );
  }

  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/");
}

// `target` is "unassigned", "team:PM" / "team:DEV" / "team:QA" to assign
// the whole team, or a profile id to assign one person.
export async function assignBug(bugId: string, target: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const assigneeTeam = target.startsWith("team:")
    ? (target.slice("team:".length) as UserRole)
    : null;
  const assigneeId = !assigneeTeam && target !== "unassigned" ? target : null;

  const { data: bug, error } = await supabase
    .from("bugs")
    .update({ assignee_id: assigneeId, assignee_team: assigneeTeam })
    .eq("id", bugId)
    .select("title")
    .single();

  if (error) {
    throw new Error(`Failed to assign bug: ${error.message}`);
  }

  if (user && bug) {
    const recipients = await resolveRecipients(supabase, {
      assignee_id: assigneeId,
      assignee_team: assigneeTeam,
    });
    await notifyRecipients(
      supabase,
      user.id,
      recipients,
      bugId,
      "assigned",
      `Assigned: ${truncate(bug.title, 40)}`,
    );
  }

  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/");
}

export async function updateBugFields(
  bugId: string,
  fields: {
    title: string;
    description: string;
    test_case_id: string | null;
    priority: BugPriority;
    severity: BugSeverity;
    steps_to_reproduce: string;
    actual_result: string;
    expected_result: string;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("bugs").update(fields).eq("id", bugId);

  if (error) {
    throw new Error(`Failed to update bug: ${error.message}`);
  }

  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/");
}

export async function addComment(bugId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trimmed = content.trim();
  if (!trimmed) return;

  const [{ error }, { data: bug }] = await Promise.all([
    supabase.from("bug_comments").insert({
      bug_id: bugId,
      author_id: user.id,
      content: trimmed,
    }),
    supabase
      .from("bugs")
      .select("assignee_id, assignee_team, title")
      .eq("id", bugId)
      .single(),
  ]);

  if (error) {
    throw new Error(`Failed to post comment: ${error.message}`);
  }

  if (bug) {
    const recipients = await resolveRecipients(supabase, bug);
    await notifyRecipients(
      supabase,
      user.id,
      recipients,
      bugId,
      "new_comment",
      `New comment: ${truncate(bug.title, 40)}`,
    );
  }

  revalidatePath(`/bugs/${bugId}`);
}
