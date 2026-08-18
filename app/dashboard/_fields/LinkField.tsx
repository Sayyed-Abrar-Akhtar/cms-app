"use client";

import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

type LinkValue = { label: string; href: string };

function asLink(value: unknown): LinkValue {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    return {
      label: typeof v.label === "string" ? v.label : "",
      href: typeof v.href === "string" ? v.href : "",
    };
  }
  return { label: "", href: "" };
}

/** LINK — a label plus an href, stored as { label, href }. */
export function LinkField({ field, value, onChange }: FieldProps) {
  const link = asLink(value);

  return (
    <FieldShell field={field}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          className={inputClassName}
          value={link.label}
          placeholder="Label (e.g. Read more)"
          onChange={(e) => onChange({ ...link, label: e.target.value })}
        />
        <input
          type="url"
          className={inputClassName}
          value={link.href}
          placeholder="https://…"
          onChange={(e) => onChange({ ...link, href: e.target.value })}
        />
      </div>
    </FieldShell>
  );
}
