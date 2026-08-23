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

    // Quota check for EDITORS
    if (user.role === "EDITOR") {
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const periodStart = user.quotaPeriodStart ? new Date(user.quotaPeriodStart).getTime() : now.getTime();

      if (now.getTime() >= periodStart + THIRTY_DAYS_MS) {
        user.updatesUsedInPeriod = 0;
        user.quotaPeriodStart = now;
      }

      const quota = user.updateQuota ?? 30;
      const used = user.updatesUsedInPeriod ?? 0;

      if (used >= quota) {
        return {
          success: false,
          error: `You've used all ${quota} of your updates for this period. Ask your admin if you need more.`,
        };
      }

      user.updatesUsedInPeriod = used + 1;
      await user.save();
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

/**
 * Allows an editor to add a new instance of a repeatable component type.
 */
export async function addRepeatableInstanceAction(
  orgSlug: string,
  page: string,
  componentTypeId: string
): Promise<ActionResponse> {
  try {
    const user = await requireEditor();
    await connectDB();

    const org = await Organization.findOne({ slug: orgSlug });
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    if (user.role === "EDITOR") {
      const userOrgs = user.organizations ?? [];
      const isMember = userOrgs.some(
        (orgId) => orgId.toString() === org._id.toString()
      );
      if (!isMember) {
        return { success: false, error: "Unauthorized for this organization." };
      }
    }

    const componentType = await ComponentType.findById(componentTypeId);
    if (!componentType) {
      return { success: false, error: "Component type not found." };
    }

    if (!componentType.isRepeatable) {
      return {
        success: false,
        error: "Only repeatable components can be added by editors.",
      };
    }

    const lastInstance = await ComponentInstance.findOne({
      organization: org._id,
      page,
    })
      .sort({ order: -1 })
      .lean();

    const nextOrder = lastInstance ? lastInstance.order + 1 : 0;

    await ComponentInstance.create({
      organization: org._id,
      componentType: componentType._id,
      page,
      order: nextOrder,
      values: [],
      updatedBy: user.email,
    });

    revalidatePath(`/dashboard/${org.slug}/${page}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to add repeatable component." };
  }
}

/**
 * Allows an editor to remove an instance of a repeatable component type.
 */
export async function removeRepeatableInstanceAction(
  instanceId: string
): Promise<ActionResponse> {
  try {
    const user = await requireEditor();
    await connectDB();

    const instance = await ComponentInstance.findById(instanceId);
    if (!instance) {
      return { success: false, error: "Component instance not found." };
    }

    if (user.role === "EDITOR") {
      const userOrgs = user.organizations ?? [];
      const isMember = userOrgs.some(
        (orgId) => orgId.toString() === instance.organization.toString()
      );
      if (!isMember) {
        return { success: false, error: "Unauthorized for this organization." };
      }
    }

    const componentType = await ComponentType.findById(instance.componentType);
    if (!componentType || !componentType.isRepeatable) {
      return {
        success: false,
        error: "Only repeatable components can be removed by editors.",
      };
    }

    const org = await Organization.findById(instance.organization).lean();
    await ComponentInstance.deleteOne({ _id: instanceId });

    if (org) {
      revalidatePath(`/dashboard/${org.slug}/${instance.page}`);
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to remove component instance." };
  }
}

/**
 * Allows an editor to reorder instances on a page.
 */
export async function reorderRepeatableInstancesAction(
  orgSlug: string,
  page: string,
  instanceIdsInOrder: string[]
): Promise<ActionResponse> {
  try {
    const user = await requireEditor();
    await connectDB();

    const org = await Organization.findOne({ slug: orgSlug });
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    if (user.role === "EDITOR") {
      const userOrgs = user.organizations ?? [];
      const isMember = userOrgs.some(
        (orgId) => orgId.toString() === org._id.toString()
      );
      if (!isMember) {
        return { success: false, error: "Unauthorized for this organization." };
      }
    }

    const bulkOps = instanceIdsInOrder.map((id, index) => ({
      updateOne: {
        filter: { _id: id, organization: org._id, page },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await ComponentInstance.bulkWrite(bulkOps);
    }

    revalidatePath(`/dashboard/${org.slug}/${page}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Failed to reorder component instances." };
  }
}
