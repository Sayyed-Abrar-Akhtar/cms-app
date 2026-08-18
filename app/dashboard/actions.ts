"use server";

import { requireEditor } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { validateFieldValue } from "@/lib/validate-field";
import { ComponentInstance } from "@/models/ComponentInstance";
import { ComponentType } from "@/models/ComponentType";
import { Organization } from "@/models/Organization";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Save an editor's values onto one ComponentInstance.
 *
 * Security (AGENTS.md §8): the instance's organization is checked against
 * the *session* user's organizations array server-side.
 */
export async function saveInstanceValuesAction(
  instanceId: string,
  rawValues: Record<string, unknown>
): Promise<ActionResponse> {
  try {
    const user = await requireEditor();

    await connectDB();

    const instance = await ComponentInstance.findById(instanceId);
    if (!instance) {
      return { success: false, error: "This component no longer exists — reload the page." };
    }

    // Security check: For EDITORS, verify server-side that the instance's org is in user's organizations
    if (user.role === "EDITOR") {
      const userOrgs = user.organizations ?? [];
      const isMember = userOrgs.some(
        (orgId) => orgId.toString() === instance.organization.toString()
      );
      if (!isMember) {
        return {
          success: false,
          error: "This component belongs to a different organization.",
        };
      }
    }

    const componentType = await ComponentType.findById(instance.componentType);
    if (!componentType) {
      return {
        success: false,
        error: "This component's type definition is missing — contact your admin.",
      };
    }

    // Validate defined fields
    const existingByKey = new Map(instance.values.map((v) => [v.key, v.value]));
    const nextValues = componentType.fields.map((field) => {
      const result = validateFieldValue(field, rawValues[field.key]);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return { key: field.key, value: result.value };
    });

    // Preserve orphaned values
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

    const org = await Organization.findById(instance.organization).lean();
    if (org) {
      revalidatePath(`/dashboard/${org.slug}/${instance.page}`);
    }

    return { success: true };
  } catch (err) {
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
