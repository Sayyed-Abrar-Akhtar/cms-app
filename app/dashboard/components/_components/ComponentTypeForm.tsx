"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FIELD_TYPES, FIELD_TYPE_LABELS, type FieldType, type FieldDefinition } from "@/lib/field-types";
import { createComponentTypeAction, updateComponentTypeAction } from "../actions";

export interface ComponentTypeFormProps {
  initialData?: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isRepeatable: boolean;
    fields: FieldDefinition[];
  };
  hasInstancesWarning?: boolean;
}

interface EditableFieldRow {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  helpText: string;
  selectOptionsStr: string;
  maxLengthStr: string;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ComponentTypeForm({ initialData, hasInstancesWarning }: ComponentTypeFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugIsCustomized, setSlugIsCustomized] = useState(isEditing);
  const [description, setDescription] = useState(initialData?.description || "");
  const [isRepeatable, setIsRepeatable] = useState(initialData?.isRepeatable || false);

  const [fieldRows, setFieldRows] = useState<EditableFieldRow[]>(() => {
    if (initialData?.fields && initialData.fields.length > 0) {
      return initialData.fields.map((f, index) => {
        const config = f.config || {};
        let optionsStr = "";
        if (Array.isArray(config.options)) {
          optionsStr = config.options.join(", ");
        }
        return {
          id: `field-${index}-${Date.now()}`,
          key: f.key,
          label: f.label,
          type: f.type,
          required: Boolean(f.required),
          helpText: f.helpText || "",
          selectOptionsStr: optionsStr,
          maxLengthStr: config.maxLength ? String(config.maxLength) : "",
        };
      });
    }
    return [
      {
        id: `field-0-${Date.now()}`,
        key: "headline",
        label: "Headline",
        type: "TEXT",
        required: true,
        helpText: "",
        selectOptionsStr: "",
        maxLengthStr: "",
      },
    ];
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugIsCustomized) {
      setSlug(generateSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugIsCustomized(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const addFieldRow = () => {
    setFieldRows((prev) => [
      ...prev,
      {
        id: `field-${prev.length}-${Date.now()}`,
        key: "",
        label: "",
        type: "TEXT",
        required: false,
        helpText: "",
        selectOptionsStr: "",
        maxLengthStr: "",
      },
    ]);
  };

  const removeFieldRow = (id: string) => {
    setFieldRows((prev) => prev.filter((row) => row.id !== id));
  };

  const moveFieldRow = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fieldRows.length - 1) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;

    setFieldRows((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const updateFieldRow = (id: string, updates: Partial<EditableFieldRow>) => {
    setFieldRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...updates };
        // Auto-suggest field key from label if key hasn't been manually altered or is empty
        if (updates.label !== undefined && (!row.key || row.key === generateSlug(row.label).replace(/-/g, "_"))) {
          updated.key = generateSlug(updates.label).replace(/-/g, "_");
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formattedFields = fieldRows.map((row, index) => {
        const config: Record<string, unknown> = {};

        if (row.type === "SELECT") {
          const options = row.selectOptionsStr
            .split(",")
            .map((opt) => opt.trim())
            .filter(Boolean);
          config.options = options;
        } else if (row.type === "TEXT") {
          if (row.maxLengthStr.trim()) {
            const parsed = parseInt(row.maxLengthStr.trim(), 10);
            if (!isNaN(parsed)) {
              config.maxLength = parsed;
            }
          }
        } else if (row.type === "IMAGE") {
          config.allowedDomains = ["res.cloudinary.com"];
        }

        return {
          key: row.key.trim(),
          label: row.label.trim(),
          type: row.type,
          required: row.required,
          order: index,
          helpText: row.helpText.trim() || undefined,
          config,
        };
      });

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        isRepeatable,
        fields: formattedFields,
      };

      let result;
      if (isEditing && initialData) {
        result = await updateComponentTypeAction(initialData._id, payload);
      } else {
        result = await createComponentTypeAction(payload);
      }

      if (!result.success) {
        setError(result.error || "An error occurred while saving.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard/components");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Terminal Header Chrome */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#17171b] px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80" />
            </div>
            <div className="text-xs text-[var(--color-muted)] font-mono">
              ~/cms/components/{isEditing ? `${initialData?.slug}.json` : "new.json"}
            </div>
            <div className="w-12" />
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/components"
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    ← components
                  </Link>
                  <span className="text-xs text-[var(--color-muted)]">/</span>
                  <span className="text-xs text-[var(--color-accent)]">
                    {isEditing ? initialData?.slug : "new"}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-[var(--color-foreground)] mt-1">
                  {isEditing ? `Edit: ${initialData?.name}` : "Create Component Type"}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/components"
                  className="py-1.5 px-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting
                    ? isEditing
                      ? "Saving changes..."
                      : "Creating component..."
                    : isEditing
                    ? "Save changes"
                    : "Create component type"}
                </button>
              </div>
            </div>

            {hasInstancesWarning && (
              <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-warning)]/60 rounded text-xs text-[var(--color-warning)] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Warning: Instances exist for this component type
                </div>
                <p className="text-[var(--color-muted)]">
                  Editing fields on a component type with existing instances is permitted, but removing fields will cause existing instance values for those fields to be orphaned.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-950/30 border border-[var(--color-danger)]/40 rounded text-xs text-[var(--color-danger)] font-mono">
                [error] {error}
              </div>
            )}

            {/* General Settings Config */}
            <div className="space-y-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] border-b border-[var(--color-border)] pb-2">
                01 // General Config
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)] block">
                    Name <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Banner, Project Card"
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-foreground)] block">
                    Slug <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g. banner, project-card"
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-foreground)] block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this component type..."
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRepeatable}
                    onChange={(e) => setIsRepeatable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                  <span className="ml-3 text-xs font-semibold text-[var(--color-foreground)]">
                    Repeatable Component
                  </span>
                </label>
                <span className="text-xs text-[var(--color-muted)]">
                  (If enabled, editors can add/remove multiple instances of this component on their page, e.g. project lists)
                </span>
              </div>
            </div>

            {/* Field definitions builder */}
            <div className="space-y-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                  02 // Fields Definition Config ({fieldRows.length})
                </h2>
                <button
                  type="button"
                  onClick={addFieldRow}
                  className="py-1 px-3 bg-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-foreground)] text-xs rounded transition-colors"
                >
                  + Add Field
                </button>
              </div>

              {fieldRows.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--color-danger)] border border-dashed border-[var(--color-border)] rounded">
                  At least one field is required. Click "+ Add Field" above.
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--color-accent)] font-mono">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-mono text-[var(--color-muted)]">
                            {row.key ? `${row.key}: ${row.type}` : "new_field"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveFieldRow(index, "up")}
                            className="p-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === fieldRows.length - 1}
                            onClick={() => moveFieldRow(index, "down")}
                            className="p-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFieldRow(row.id)}
                            className="ml-2 text-xs text-[var(--color-danger)] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--color-muted)] block">
                            Label <span className="text-[var(--color-danger)]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={row.label}
                            onChange={(e) => updateFieldRow(row.id, { label: e.target.value })}
                            placeholder="e.g. Headline"
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--color-muted)] block">
                            Key <span className="text-[var(--color-danger)]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={row.key}
                            onChange={(e) => updateFieldRow(row.id, { key: e.target.value })}
                            placeholder="e.g. headline"
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[var(--color-muted)] block">
                            Field Type <span className="text-[var(--color-danger)]">*</span>
                          </label>
                          <select
                            value={row.type}
                            onChange={(e) => updateFieldRow(row.id, { type: e.target.value as FieldType })}
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]"
                          >
                            {FIELD_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {FIELD_TYPE_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                            <input
                              type="checkbox"
                              checked={row.required}
                              onChange={(e) => updateFieldRow(row.id, { required: e.target.checked })}
                              className="rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] focus:ring-0"
                            />
                            <span className="text-xs text-[var(--color-foreground)]">Required field</span>
                          </label>
                        </div>
                      </div>

                      {/* Type-Specific Configurations */}
                      {row.type === "SELECT" && (
                        <div className="space-y-1 pt-1 border-t border-[var(--color-border)]/40">
                          <label className="text-[11px] font-semibold text-[var(--color-muted)] block">
                            Options (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={row.selectOptionsStr}
                            onChange={(e) => updateFieldRow(row.id, { selectOptionsStr: e.target.value })}
                            placeholder="e.g. left, center, right"
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      )}

                      {row.type === "TEXT" && (
                        <div className="space-y-1 pt-1 border-t border-[var(--color-border)]/40">
                          <label className="text-[11px] font-semibold text-[var(--color-muted)] block">
                            Max Length (optional number)
                          </label>
                          <input
                            type="number"
                            value={row.maxLengthStr}
                            onChange={(e) => updateFieldRow(row.id, { maxLengthStr: e.target.value })}
                            placeholder="e.g. 120"
                            className="w-36 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      )}

                      {row.type === "IMAGE" && (
                        <div className="pt-1 border-t border-[var(--color-border)]/40 text-[11px] text-[var(--color-muted)] flex items-center gap-2">
                          <span className="text-[var(--color-accent)]">🔒 locked domain:</span>
                          <span className="font-mono text-[var(--color-foreground)]">res.cloudinary.com</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <input
                          type="text"
                          value={row.helpText}
                          onChange={(e) => updateFieldRow(row.id, { helpText: e.target.value })}
                          placeholder="Help text for editors (optional)"
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-[var(--color-muted)] focus:text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
              <Link
                href="/dashboard/components"
                className="py-2 px-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-6 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Creating component..."
                  : isEditing
                  ? "Save changes"
                  : "Create component type"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
