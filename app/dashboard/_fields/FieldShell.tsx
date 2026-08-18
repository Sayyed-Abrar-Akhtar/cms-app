"use client";

import type { FieldDefinition } from "@/lib/field-types";

/**
 * Shared chrome for every field editor: monospace `key: TYPE` header row
 * (config-file look, AGENTS.md §7) + label/help text underneath.
 */
export function FieldShell({
  field,
  children,
}: {
  field: FieldDefinition;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="font-mono text-xs text-[var(--color-foreground)]">
          <span className="text-[var(--color-muted)]">{field.key}:</span>{" "}
          <span className="text-[var(--color-accent)]">{field.type}</span>
          {field.required && (
            <span className="text-[var(--color-warning)]"> *</span>
          )}
        </label>
        <span className="font-sans text-xs text-[var(--color-muted)]">
          {field.label}
        </span>
      </div>
      {children}
      {field.helpText && (
        <p className="font-sans text-xs text-[var(--color-muted)]">
          {field.helpText}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  "w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-sans text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none";

export type FieldProps = {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
};
