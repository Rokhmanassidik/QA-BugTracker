"use client";

import { useRef, useState } from "react";
import { FileImage, FileVideo, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceFilePicker({
  value,
  onChange,
  compact = false,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  compact?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFilesSelected(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setProcessing(true);
    try {
      const processed = await Promise.all(
        Array.from(selected).map((file) =>
          file.type.startsWith("image/") ? compressImage(file) : file,
        ),
      );
      onChange([...value, ...processed]);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-60",
          compact ? "px-4 py-4" : "px-4 py-8",
        )}
      >
        {processing ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Upload className="size-5" />
        )}
        <span>
          {processing ? (
            "Processing..."
          ) : (
            <>
              <span className="font-medium text-foreground">Click to upload</span>{" "}
              photos or videos
            </>
          )}
        </span>
      </button>

      {value.length > 0 ? (
        <ul className="space-y-1.5">
          {value.map((file, index) => (
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
}
