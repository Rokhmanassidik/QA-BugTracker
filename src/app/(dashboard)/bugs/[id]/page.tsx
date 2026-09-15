import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BugDetail } from "./bug-detail";
import type { Bug, BugComment, BugEvidence, Profile } from "@/types/database";

const EVIDENCE_BUCKET = "bug-evidence";

export default async function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: bug, error },
    { data: profiles },
    { data: comments },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("bugs").select("*").eq("id", id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("bug_comments").select("*").eq("bug_id", id).order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (error || !bug) {
    notFound();
  }

  const { data: evidence } = await supabase
    .from("bug_evidence")
    .select("*")
    .eq("bug_id", id)
    .order("created_at", { ascending: true });

  const evidenceWithUrls = await Promise.all(
    ((evidence as BugEvidence[]) || []).map(async (item) => {
      const { data: signed } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(item.file_path, 60 * 60);
      return { ...item, url: signed?.signedUrl || null };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BugDetail
        bug={bug as Bug}
        profiles={(profiles as Profile[]) || []}
        evidence={evidenceWithUrls}
        comments={(comments as BugComment[]) || []}
        currentUserId={user?.id || null}
      />
    </div>
  );
}
