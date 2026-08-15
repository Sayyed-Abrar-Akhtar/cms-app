/**
 * Every field type a superadmin can use when building a Component Type.
 * Adding a new type means: add it here, add a matching input renderer in
 * app/dashboard/components/_fields/, and (if needed) validation in
 * lib/validate-field.ts. Nothing else in the data model changes — this is
 * the one place the "kinds of content" are enumerated.
 */
export const FIELD_TYPES = [
  "TEXT",
  "RICH_TEXT",
  "IMAGE",
  "STRING_URL",
  "BOOLEAN",
  "NUMBER",
  "SELECT",
  "LINK",
  "DATE",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text (single line)",
  RICH_TEXT: "Rich text",
  IMAGE: "Image",
  STRING_URL: "URL / link value",
  BOOLEAN: "Toggle (yes/no)",
  NUMBER: "Number",
  SELECT: "Select (fixed options)",
  LINK: "Link (label + href)",
  DATE: "Date",
};

export interface FieldDefinition {
  key: string; // machine key, e.g. "headline" — used to look up the value
  label: string; // shown to editors, e.g. "Headline"
  type: FieldType;
  required: boolean;
  order: number;
  helpText?: string;
  /**
   * Type-specific config, e.g.
   * IMAGE:     { allowedDomains: ["res.cloudinary.com"] }
   * TEXT:      { maxLength: 120 }
   * SELECT:    { options: ["left", "center", "right"] }
   */
  config?: Record<string, unknown>;
}
