"use client";

import { useState } from "react";
import { FieldShell, inputClassName, type FieldProps } from "./FieldShell";

/**
 * STRING_URL — a bare URL. Not to be confused with LINK (label + href).
 */
export function UrlField({ field, value, onChange }: FieldProps) {
  const [error, setError] = useState<string | null>(null);
  const str = typeof value === "string" ? value : "";

  return (
    <FieldShell field={field}>
      <input
        type="url"
        className={inputClassName}
        value={str}
        placeholder="https://…"
        onChange={(e) => {
          setError(null);
          onChange(e.target.value);
        }}
        onBlur={() => {
          if (!str.trim()) return setError(null);
          try {
            const url = new URL(str.trim());
            if (url.protocol !== "https:" && url.protocol !== "http:") {
              setError("URL must start with https:// or http://.");
            } else {
              setError(null);
            }
          } catch {
            setError("That is not a valid URL.");
          }
        }}
      />
      {error && (
        <p className="font-sans text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </FieldShell>
  );
}
