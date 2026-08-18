import type { FieldDefinition } from "@/lib/field-types";

/**
 * Server-side validation + sanitization for ComponentInstance values.
 * Every write path (Server Action, and later the public API if it ever
 * accepts writes) must pass values through here — client-side checks are
 * UX only, never security (see AGENTS.md §8).
 */

export const CLOUDINARY_HOSTNAME = "res.cloudinary.com";

export type ValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return false;
    // Check if object fields have any non-empty string values
    return Object.values(value as Record<string, unknown>).some(
      (v) => typeof v === "string" && v.trim().length > 0
    );
  }
  return true; // numbers (incl. 0) and booleans (incl. false) count as present
}

function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export function isCloudinaryUrl(value: unknown): boolean {
  const url = parseHttpUrl(value);
  return url !== null && url.hostname === CLOUDINARY_HOSTNAME;
}

/* ------------------------------------------------------------------ */
/* Rich text (Tiptap JSON) sanitization                                */
/* ------------------------------------------------------------------ */

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "image",
]);

const ALLOWED_MARK_TYPES = new Set(["bold", "italic", "link"]);

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

function sanitizeMark(mark: { type?: string; attrs?: Record<string, unknown> }): unknown | null {
  if (!mark.type || !ALLOWED_MARK_TYPES.has(mark.type)) return null;
  if (mark.type === "link") {
    const href = mark.attrs?.href;
    const url = parseHttpUrl(href);
    const isMailto =
      typeof href === "string" && /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(href.trim());
    if (!url && !isMailto) return null;
    return {
      type: "link",
      attrs: {
        href: typeof href === "string" ? href.trim() : "",
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    };
  }
  return { type: mark.type };
}

function sanitizeNode(node: JsonNode): JsonNode | null {
  if (!node || typeof node !== "object" || !node.type) return null;
  if (!ALLOWED_NODE_TYPES.has(node.type)) return null;

  const out: JsonNode = { type: node.type };

  if (node.type === "text") {
    out.text = typeof node.text === "string" ? node.text : "";
  }

  if (node.type === "heading") {
    const level = node.attrs?.level;
    out.attrs = { level: level === 2 || level === 3 ? level : 2 };
  }

  if (node.type === "image") {
    const src = node.attrs?.src;
    if (!isCloudinaryUrl(src)) return null;
    out.attrs = {
      src: (src as string).trim(),
      alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : "",
    };
  }

  if (Array.isArray(node.marks)) {
    const marks = node.marks
      .map(sanitizeMark)
      .filter((m): m is NonNullable<typeof m> => m !== null);
    if (marks.length > 0) out.marks = marks as JsonNode["marks"];
  }

  if (Array.isArray(node.content)) {
    out.content = node.content
      .map(sanitizeNode)
      .filter((n): n is JsonNode => n !== null);
  }

  return out;
}

export function sanitizeRichText(value: unknown): JsonNode | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as JsonNode;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return null;
  const sanitized = sanitizeNode(doc);
  return sanitized && sanitized.type === "doc" ? sanitized : null;
}

/* ------------------------------------------------------------------ */
/* Per-type validation                                                 */
/* ------------------------------------------------------------------ */

export function validateFieldValue(
  field: FieldDefinition,
  rawValue: unknown
): ValidationResult {
  const label = field.label || field.key;

  if (!isNonEmpty(rawValue)) {
    if (field.required) {
      return { ok: false, error: `${label} is required.` };
    }
    return { ok: true, value: field.type === "BOOLEAN" ? false : null };
  }

  switch (field.type) {
    case "TEXT": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: `${label} must be text.` };
      }
      const maxLength =
        typeof field.config?.maxLength === "number" ? field.config.maxLength : null;
      if (maxLength && rawValue.length > maxLength) {
        return {
          ok: false,
          error: `${label} is ${rawValue.length} characters — the limit is ${maxLength}.`,
        };
      }
      return { ok: true, value: rawValue };
    }

    case "RICH_TEXT": {
      const doc = sanitizeRichText(rawValue);
      if (!doc) {
        return { ok: false, error: `${label} contains content the editor doesn't support — it was not saved.` };
      }
      return { ok: true, value: doc };
    }

    case "IMAGE": {
      if (!isCloudinaryUrl(rawValue)) {
        return {
          ok: false,
          error:
            "Image must be uploaded through Cloudinary — paste a res.cloudinary.com link or use Upload.",
        };
      }
      return { ok: true, value: (rawValue as string).trim() };
    }

    case "STRING_URL": {
      const url = parseHttpUrl(rawValue);
      if (!url) {
        return { ok: false, error: `${label} must be a valid URL starting with https:// or http://.` };
      }
      return { ok: true, value: url.toString() };
    }

    case "BOOLEAN": {
      return { ok: true, value: rawValue === true };
    }

    case "NUMBER": {
      const num = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (!Number.isFinite(num)) {
        return { ok: false, error: `${label} must be a number.` };
      }
      return { ok: true, value: num };
    }

    case "SELECT": {
      const options = Array.isArray(field.config?.options)
        ? (field.config.options as unknown[]).filter((o): o is string => typeof o === "string")
        : [];
      if (typeof rawValue !== "string" || !options.includes(rawValue)) {
        return {
          ok: false,
          error: `${label} must be one of: ${options.join(", ") || "(no options configured)"}.`,
        };
      }
      return { ok: true, value: rawValue };
    }

    case "LINK": {
      if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
        return { ok: false, error: `${label} must be a link with a label and a URL.` };
      }
      const link = rawValue as { label?: unknown; href?: unknown };
      const linkLabel = typeof link.label === "string" ? link.label.trim() : "";
      const url = parseHttpUrl(link.href);

      if (!field.required && !linkLabel && !url) {
        return { ok: true, value: null };
      }

      if (field.required && linkLabel.length === 0) {
        return { ok: false, error: `${label} needs a label.` };
      }
      if (!url) {
        return { ok: false, error: `${label} must have a valid URL starting with https:// or http://.` };
      }
      return { ok: true, value: { label: linkLabel, href: url.toString() } };
    }

    case "DATE": {
      if (typeof rawValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue.trim())) {
        return { ok: false, error: `${label} must be a date (YYYY-MM-DD).` };
      }
      const date = new Date(rawValue.trim());
      if (Number.isNaN(date.getTime())) {
        return { ok: false, error: `${label} is not a real calendar date.` };
      }
      return { ok: true, value: rawValue.trim() };
    }

    default:
      return { ok: false, error: `${label} has an unknown field type.` };
  }
}
