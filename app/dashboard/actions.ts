"use server";

import { requireEditor } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { validateFieldValue } from "@/lib/validate-field";
import { ComponentInstance } from "@/models/ComponentInstance";
import { ComponentType } from "@/models/ComponentType";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Save an editor's values onto one ComponentInstance.
 *
 * Security (AGENTS.md §8): the instance's organization is checked against
 * the *session* user's organization server-side. A client-supplied
 * organizationId would be ignored — editors can never write to another
 * org's instance, even by crafting a request with a guessed instance ID.
 */
export async function saveInstanceValuesAction(
  instanceId: string,
  rawValues: Record<string, unknown>
): Promise<ActionResponse> {
  try {
    const user = await requireEditor();

    if (!user.organization) {
      return {
        success: false,
        error:
          "Your account is not assigned to an organization — contact your admin.",
      };
    }

    await connectDB();

    const instance = await ComponentInstance.findById(instanceId);
    if (!instance) {
      return { success: false, error: "This component no longer exists — reload the page." };
    }

    // The non-optional ownership check.
    if (instance.organization.toString() !== user.organization.toString()) {
      return {
        success: false,
        error: "This component belongs to a different organization.",
      };
    }

    const componentType = await ComponentType.findById(instance.componentType);
    if (!componentType) {
      return {
        success: false,
        error: "This component's type definition is missing — contact your admin.",
      };
    }

    // Validate every defined field. Values for keys that are no longer in
    // the type definition are left untouched (orphaned but preserved, per
    // the component-type editor's warning) — only defined keys are written.
    const existingByKey = new Map(instance.values.map((v) => [v.key, v.value]));
    const nextValues = componentType.fields.map((field) => {
      const result = validateFieldValue(field, rawValues[field.key]);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return { key: field.key, value: result.value };
    });

    // Preserve orphaned values (fields removed from the type after values
    // were entered) so re-adding the field restores the data.
    const definedKeys = new Set(componentType.fields.map((f) => f.key));
    for (const [key, value] of existingByKey) {
      if (!definedKeys.has(key)) {
        nextValues.push({ key, value });
      }
    }

    instance.values = nextValues;
    instance.updatedAt = new Date();
    instance.updatedBy = user.email;
    await instance.save();

    revalidatePath(`/dashboard/${instance.page}`);

    return { success: true };
  } catch (err) {
    // Let Next.js redirects (from requireEditor) pass through untouched.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Save failed — try again." };
  }
}
