"use client";

import { useRef, useState } from "react";
import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";
import { uploadImageToCloudinary } from "./upload-image";

export function ImageField({ field, value, onChange }: FieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stringValue = typeof value === "string" ? value : "";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await uploadImageToCloudinary(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleTriggerUpload() {
    fileInputRef.current?.click();
  }

  return (
    <FieldShell field={field}>
      <div className="space-y-3">
        {stringValue && (
          <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stringValue}
              alt={field.label || field.key}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleTriggerUpload}
            disabled={uploading}
            className="inline-flex shrink-0 items-center justify-center rounded border border-[var(--color-accent)] bg-[var(--color-accent-dim)] px-3 py-2 font-mono text-xs text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>

          <input
            type="text"
            className={inputClassName}
            value={stringValue}
            placeholder="https://res.cloudinary.com/..."
            onChange={(e) => {
              setError(null);
              onChange(e.target.value);
            }}
          />
        </div>

        {error && (
          <p className="font-sans text-xs text-[var(--color-danger)]">
            [upload error] {error}
          </p>
        )}
      </div>
    </FieldShell>
  );
}
