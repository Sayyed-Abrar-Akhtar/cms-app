"use server";

import { z } from "zod";
import { FIELD_TYPES, type FieldDefinition } from "@/lib/field-types";
import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import { revalidatePath } from "next/cache";

const FieldDefinitionInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Field key is required")
    .regex(/^[a-zA-Z0-9_]+$/, "Field key must contain only letters, numbers, and underscores"),
  label: z.string().trim().min(1, "Field label is required"),
  type: z.enum(FIELD_TYPES, {
    message: "Invalid field type",
  }),
  required: z.boolean().default(false),
  order: z.number().default(0),
  helpText: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

const ComponentTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Component type name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  isRepeatable: z.boolean().default(false),
  fields: z.array(FieldDefinitionInputSchema).min(1, "At least one field is required"),
});

export type ComponentTypeInput = z.infer<typeof ComponentTypeInputSchema>;

export type ActionResponse = {
  success: boolean;
  error?: string;
  slug?: string;
};

export async function createComponentTypeAction(
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = ComponentTypeInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const { name, slug, description, isRepeatable, fields } = parsed.data;

    // Check duplicate field keys within a type
    const seenKeys = new Set<string>();
    for (const field of fields) {
      if (seenKeys.has(field.key)) {
        return {
          success: false,
          error: `Duplicate field key '${field.key}' found. Field keys within a component type must be unique.`,
        };
      }
      seenKeys.add(field.key);
    }

    // Check duplicate slug in DB
    const existingSlug = await ComponentType.findOne({ slug });
    if (existingSlug) {
      return {
        success: false,
        error: `Component type slug '${slug}' is already in use. Slugs must be unique.`,
      };
    }

    // Process fields config (e.g. lock IMAGE allowedDomains)
    const processedFields: FieldDefinition[] = fields.map((field, idx) => {
      const config = { ...(field.config || {}) };
      if (field.type === "IMAGE") {
        config.allowedDomains = ["res.cloudinary.com"];
      }
      return {
        ...field,
        order: field.order ?? idx,
        config,
      };
    });

    await ComponentType.create({
      name,
      slug,
      description,
      isRepeatable,
      fields: processedFields,
    });

    revalidatePath("/dashboard/components");

    return { success: true, slug };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateComponentTypeAction(
  id: string,
  rawInput: unknown
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = ComponentTypeInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const { name, slug, description, isRepeatable, fields } = parsed.data;

    // Check duplicate field keys within a type
    const seenKeys = new Set<string>();
    for (const field of fields) {
      if (seenKeys.has(field.key)) {
        return {
          success: false,
          error: `Duplicate field key '${field.key}' found. Field keys within a component type must be unique.`,
        };
      }
      seenKeys.add(field.key);
    }

    // Check duplicate slug in DB (excluding current component type ID)
    const existingSlug = await ComponentType.findOne({
      slug,
      _id: { $ne: id },
    });
    if (existingSlug) {
      return {
        success: false,
        error: `Component type slug '${slug}' is already in use by another component type. Slugs must be unique.`,
      };
    }

    // Process fields config (e.g. lock IMAGE allowedDomains)
    const processedFields: FieldDefinition[] = fields.map((field, idx) => {
      const config = { ...(field.config || {}) };
      if (field.type === "IMAGE") {
        config.allowedDomains = ["res.cloudinary.com"];
      }
      return {
        ...field,
        order: field.order ?? idx,
        config,
      };
    });

    const updated = await ComponentType.findByIdAndUpdate(
      id,
      {
        name,
        slug,
        description,
        isRepeatable,
        fields: processedFields,
      },
      { new: true }
    );

    if (!updated) {
      return { success: false, error: "Component type not found." };
    }

    revalidatePath("/dashboard/components");
    revalidatePath(`/dashboard/components/${slug}`);

    return { success: true, slug };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}
