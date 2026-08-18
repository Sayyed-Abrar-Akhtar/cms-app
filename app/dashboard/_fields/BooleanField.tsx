"use client";

import { FieldShell, type FieldProps } from "./FieldShell";

export function BooleanField({ field, value, onChange }: FieldProps) {
  const checked = value === true;
  return (
    <FieldShell field={field}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-hover)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            checked
              ? "translate-x-6 bg-[var(--color-accent)]"
              : "translate-x-1 bg-[var(--color-muted)]"
          }`}
        />
        <span className="sr-only">{field.label}</span>
      </button>
      <span className="ml-2 font-mono text-xs text-[var(--color-muted)]">
        {checked ? "true" : "false"}
      </span>
    </FieldShell>
  );
}
