"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { FileImage, FileVideo, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EvidenceFilePickerHandle {
  reset: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const EvidenceFilePicker = forwardRef<
  EvidenceFilePickerHandle,
  { name?: string; compact?: boolean }
>(function EvidenceFilePicker({ name = "evidence", compact = false }, ref) {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function syncFileInput(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
  }

  useImperativeHandle(ref, () => ({
    reset() {
      setFiles([]);
      syncFileInput([]);
    },
  }));

  function handleFilesSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const merged = [...files, ...Array.from(selected)];
    setFiles(merged);
    syncFileInput(merged);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncFileInput(next);
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        name={name}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
          compact ? "px-4 py-4" : "px-4 py-8",
        )}
      >
        <Upload className="size-5" />
        <span>
          <span className="font-medium text-foreground">Click to upload</span>{" "}
          photos or videos
        </span>
      </button>

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              {file.type.startsWith("video/") ? (
                <FileVideo className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileImage className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
