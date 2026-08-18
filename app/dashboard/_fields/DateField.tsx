"use client";

import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

export function DateField({ field, value, onChange }: FieldProps) {
  return (
    <FieldShell field={field}>
      <input
        type="date"
        className={`${inputClassName} [color-scheme:dark]`}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </FieldShell>
  );
}
