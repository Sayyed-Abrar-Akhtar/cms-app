"use client";

import { useState } from "react";
import type { FieldDefinition } from "@/lib/field-types";
import { saveInstanceValuesAction } from "@/app/dashboard/actions";
import { TextField } from "@/app/dashboard/_fields/TextField";
import { RichTextField } from "@/app/dashboard/_fields/RichTextField";
import { ImageField } from "@/app/dashboard/_fields/ImageField";
import { UrlField } from "@/app/dashboard/_fields/UrlField";
import { BooleanField } from "@/app/dashboard/_fields/BooleanField";
import { NumberField } from "@/app/dashboard/_fields/NumberField";
import { SelectField } from "@/app/dashboard/_fields/SelectField";
import { LinkField } from "@/app/dashboard/_fields/LinkField";
import { DateField } from "@/app/dashboard/_fields/DateField";

export type InstanceData = {
  id: string;
  order: number;
  typeName: string;
  typeSlug: string;
  isRepeatable: boolean;
  fields: FieldDefinition[];
  values: Record<string, unknown>;
};

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "TEXT":
      return <TextField field={field} value={value} onChange={onChange} />;
    case "RICH_TEXT":
      return <RichTextField field={field} value={value} onChange={onChange} />;
    case "IMAGE":
      return <ImageField field={field} value={value} onChange={onChange} />;
    case "STRING_URL":
      return <UrlField field={field} value={value} onChange={onChange} />;
    case "BOOLEAN":
      return <BooleanField field={field} value={value} onChange={onChange} />;
    case "NUMBER":
      return <NumberField field={field} value={value} onChange={onChange} />;
    case "SELECT":
      return <SelectField field={field} value={value} onChange={onChange} />;
    case "LINK":
      return <LinkField field={field} value={value} onChange={onChange} />;
    case "DATE":
      return <DateField field={field} value={value} onChange={onChange} />;
    default:
      return (
        <p className="font-mono text-xs text-[var(--color-danger)]">
          [error] Unknown field type — ask the admin to fix this component type.
        </p>
      );
  }
}

/**
 * One ComponentInstance rendered as a config-file-styled form. Saves are
 * explicit ("Save changes" → "Saved"), one instance at a time, and the
 * Server Action re-checks organization ownership server-side.
 */
export function InstanceForm({
  instance,
  onDirtyChange,
}: {
  instance: InstanceData;
  onDirtyChange?: (instanceId: string, isDirty: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(instance.values);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setFieldValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    onDirtyChange?.(instance.id, true);
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveInstanceValuesAction(instance.id, values);
      if (result.success) {
        setSaved(true);
        setDirty(false);
        onDirtyChange?.(instance.id, false);
      } else {
        setError(result.error || "Save failed — try again.");
      }
    } catch {
      setError("Save failed — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const sortedFields = [...instance.fields].sort((a, b) => a.order - b.order);

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5">
        <div className="font-mono text-xs">
          <span className="text-[var(--color-muted)]">
            {String(instance.order).padStart(2, "0")}
          </span>{" "}
          <span className="text-[var(--color-foreground)]">
            {instance.typeSlug}.json
          </span>
          {instance.isRepeatable && (
            <span className="ml-2 rounded bg-[var(--color-accent-dim)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]">
              repeatable
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saved && !dirty && (
            <span className="font-mono text-xs text-[var(--color-accent)]">
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded border border-[var(--color-accent)] bg-[var(--color-accent-dim)] px-3 py-1 font-mono text-xs text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        {error && (
          <p className="rounded border border-[var(--color-danger)]/40 bg-[var(--color-surface-hover)] p-2 font-sans text-xs text-[var(--color-danger)]">
            [error] {error}
          </p>
        )}
        {sortedFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => setFieldValue(field.key, v)}
          />
        ))}
      </div>
    </section>
  );
}
