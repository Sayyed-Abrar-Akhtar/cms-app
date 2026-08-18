"use client";

import { useRef, useState } from "react";
import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";
import { uploadImageToCloudinary } from "./upload-image";

const CLOUDINARY_HOST = "res.cloudinary.com";

export function ImageField({ field, value, onChange }: FieldProps) {
  const url = typeof value === "string" ? value : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const secureUrl = await uploadImageToCloudinary(file);
      onChange(secureUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePaste(raw: string) {
    onChange(raw);
    setError(null);
  }

  function validatePasted() {
    const trimmed = url.trim();
    if (!trimmed) return setError(null);
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname !== CLOUDINARY_HOST) {
        setError(
          "Image must be uploaded through Cloudinary — paste a res.cloudinary.com link or use Upload."
        );
      } else {
        setError(null);
      }
    } catch {
      setError("That is not a valid URL.");
    }
  }

  return (
    <FieldShell field={field}>
      <div className="space-y-2">
        {url && !error && (
          // eslint-disable-next-line @next/next/no-img-element -- editor preview, not the public site
          <img
            src={url}
            alt={field.label}
            className="max-h-40 rounded border border-[var(--color-border)] object-contain"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-[var(--color-accent)] bg-[var(--color-accent-dim)] px-3 py-1.5 font-mono text-xs text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          <span className="font-mono text-xs text-[var(--color-muted)]">or</span>
          <input
            type="url"
            className={`${inputClassName} min-w-0 flex-1`}
            value={url}
            placeholder={`https://${CLOUDINARY_HOST}/…`}
            onChange={(e) => handlePaste(e.target.value)}
            onBlur={validatePasted}
          />
        </div>

        {error && (
          <p className="font-sans text-xs text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    </FieldShell>
  );
}
