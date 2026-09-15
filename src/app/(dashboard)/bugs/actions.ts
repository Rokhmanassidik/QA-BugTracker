"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BugPriority,
  BugSeverity,
  BugStatus,
  EvidenceFileType,
  NotificationType,
} from "@/types/database";

const EVIDENCE_BUCKET = "bug-evidence";

async function notifyOthers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  bugId: string,
  type: NotificationType,
  action: string,
) {
  const [{ data: recipients }, { data: actor }, { data: bug }] = await Promise.all([
    supabase.from("profiles").select("id").neq("id", actorId),
    supabase.from("profiles").select("full_name").eq("id", actorId).single(),
    supabase.from("bugs").select("title").eq("id", bugId).single(),
  ]);

  if (!recipients || recipients.length === 0) return;

  const actorName = actor?.full_name || "Someone";
  const bugTitle = bug?.title || "a bug";
  const message = `${actorName} ${action} "${bugTitle}"`;

  await supabase.from("notifications").insert(
    recipients.map((recipient) => ({
      recipient_id: recipient.id,
      actor_id: actorId,
      bug_id: bugId,
      type,
      message,
    })),
  );
}

function evidenceTypeFor(file: File): EvidenceFileType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

async function uploadEvidenceFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bugId: string,
  files: File[],
  uploadedBy: string,
) {
  for (const file of files) {
    if (file.size === 0) continue;
    const fileType = evidenceTypeFor(file);
    if (!fileType) continue;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${bugId}/${randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      throw new Error(`Failed to upload evidence: ${uploadError.message}`);
    }

    const { error: insertError } = await supabase.from("bug_evidence").insert({
      bug_id: bugId,
      file_path: path,
      file_type: fileType,
      file_name: file.name,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      throw new Error(`Failed to save evidence: ${insertError.message}`);
    }
  }
}

export async function createBug(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
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

  const files = formData.getAll("evidence").filter((f): f is File => f instanceof File);
  await uploadEvidenceFiles(supabase, bug.id, files, user.id);

  revalidatePath("/");
  redirect(`/bugs/${bug.id}`);
}

export async function addEvidence(bugId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const files = formData.getAll("evidence").filter((f): f is File => f instanceof File);
  await uploadEvidenceFiles(supabase, bugId, files, user.id);

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

  const { error } = await supabase
    .from("bugs")
    .update({ status })
    .eq("id", bugId);

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  if (user) {
    await notifyOthers(supabase, user.id, bugId, "status_change", `changed the status to ${status} on`);
  }

  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/");
}

export async function assignBug(bugId: string, assigneeId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bugs")
    .update({ assignee_id: assigneeId })
    .eq("id", bugId);

  if (error) {
    throw new Error(`Failed to assign bug: ${error.message}`);
  }

  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/");
}

export async function updateBugFields(
  bugId: string,
  fields: {
    title: string;
    description: string;
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

  const { error } = await supabase.from("bug_comments").insert({
    bug_id: bugId,
    author_id: user.id,
    content: trimmed,
  });

  if (error) {
    throw new Error(`Failed to post comment: ${error.message}`);
  }

  await notifyOthers(supabase, user.id, bugId, "new_comment", "commented on");

  revalidatePath(`/bugs/${bugId}`);
}
