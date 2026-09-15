"use client";

import { createClient } from "@/lib/supabase/client";
import type { EvidenceFileType } from "@/types/database";

const EVIDENCE_BUCKET = "bug-evidence";
// Matches the Supabase free-tier per-file cap; raise this if the project
// upgrades and the bucket's file size limit is raised too.
const MAX_EVIDENCE_SIZE = 50 * 1024 * 1024;

export interface UploadedEvidence {
  path: string;
  file_type: EvidenceFileType;
  file_name: string;
}

function evidenceTypeFor(file: File): EvidenceFileType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

// Uploads files straight from the browser to Supabase Storage, bypassing
// our server entirely. This avoids Vercel's ~4.5 MB Serverless Function
// request body limit, which a server-relayed upload would hit for anything
// but small screenshots.
export async function uploadEvidenceFiles(
  bugId: string,
  files: File[],
): Promise<UploadedEvidence[]> {
  const supabase = createClient();
  const uploaded: UploadedEvidence[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    const fileType = evidenceTypeFor(file);
    if (!fileType) continue;

    if (file.size > MAX_EVIDENCE_SIZE) {
      throw new Error(`"${file.name}" is larger than 50 MB and can't be uploaded.`);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${bugId}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      throw new Error(`Failed to upload "${file.name}": ${error.message}`);
    }

    uploaded.push({ path, file_type: fileType, file_name: file.name });
  }

  return uploaded;
}
