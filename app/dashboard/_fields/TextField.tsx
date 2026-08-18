"use client";

import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

export function TextField({ field, value, onChange }: FieldProps) {
  const maxLength =
    typeof field.config?.maxLength === "number" ? field.config.maxLength : undefined;
  return (
    <FieldShell field={field}>
      <input
        type="text"
        className={inputClassName}
        value={typeof value === "string" ? value : ""}
        maxLength={maxLength}
        placeholder={field.label}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}
