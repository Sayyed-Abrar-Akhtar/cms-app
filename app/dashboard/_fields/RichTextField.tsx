"use client";

import { FieldShell, type FieldProps } from "./FieldShell";

export function RichTextField({ field }: FieldProps) {
  return (
    <FieldShell field={field}>
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 text-xs text-[var(--color-muted)] font-mono">
        [RICH_TEXT field - Tiptap editor coming soon]
      </div>
    </FieldShell>
  );
}
