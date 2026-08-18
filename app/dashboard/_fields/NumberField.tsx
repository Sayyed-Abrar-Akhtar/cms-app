"use client";

import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

export function NumberField({ field, value, onChange }: FieldProps) {
  return (
    <FieldShell field={field}>
      <input
        type="number"
        className={inputClassName}
        value={typeof value === "number" ? value : ""}
        placeholder={field.label}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
      />
    </FieldShell>
  );
}
