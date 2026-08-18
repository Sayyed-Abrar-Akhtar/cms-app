"use client";

import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

export function SelectField({ field, value, onChange }: FieldProps) {
  const options = Array.isArray(field.config?.options)
    ? (field.config.options as unknown[]).filter(
        (o): o is string => typeof o === "string"
      )
    : [];

  return (
    <FieldShell field={field}>
      <select
        className={inputClassName}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— choose —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="font-sans text-xs text-[var(--color-warning)]">
          No options configured for this field — ask the admin to add them to
          the component type.
        </p>
      )}
    </FieldShell>
  );
}
