"use client";

import { FieldShell, type FieldProps } from "./FieldShell";

export function ImageField({ field }: FieldProps) {
  return (
    <FieldShell field={field}>
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 text-xs text-[var(--color-muted)] font-mono">
        [IMAGE field - Cloudinary integration coming soon]
      </div>
    </FieldShell>
  );
}
