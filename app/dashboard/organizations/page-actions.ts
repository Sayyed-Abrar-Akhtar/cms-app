"use server";

import { z } from "zod";
import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ComponentType } from "@/models/ComponentType";
import { ComponentInstance } from "@/models/ComponentInstance";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

const AddComponentInstanceSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  componentTypeId: z.string().trim().min(1, "Component Type ID is required"),
  page: z
    .string()
    .trim()
    .min(1, "Page name is required")
    .regex(/^[a-z0-9-/]+$/, "Page name can only contain lowercase letters, numbers, hyphens, and slashes"),
});

const ReorderComponentInstancesSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  page: z.string().trim().min(1, "Page name is required"),
  instanceIdsInOrder: z.array(z.string().trim().min(1)),
});

const RemoveComponentInstanceSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  instanceId: z.string().trim().min(1, "Instance ID is required"),
});

export async function addComponentInstanceAction(
  organizationId: string,
  componentTypeId: string,
  page: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const cleanPage = page.trim().toLowerCase();

    const parsed = AddComponentInstanceSchema.safeParse({
      organizationId,
      componentTypeId,
      page: cleanPage,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const compType = await ComponentType.findById(componentTypeId);
    if (!compType) {
      return { success: false, error: "Component type not found." };
    }

    // Find the current highest order on this page
    const lastInstance = await ComponentInstance.findOne({
      organization: org._id,
      page: cleanPage,
    })
      .sort({ order: -1 })
      .lean();

    const nextOrder = lastInstance ? lastInstance.order + 1 : 0;

    await ComponentInstance.create({
      organization: org._id,
      componentType: compType._id,
      page: cleanPage,
      order: nextOrder,
      values: [],
    });

    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function reorderComponentInstancesAction(
  organizationId: string,
  page: string,
  instanceIdsInOrder: string[]
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const cleanPage = page.trim().toLowerCase();

    const parsed = ReorderComponentInstancesSchema.safeParse({
      organizationId,
      page: cleanPage,
      instanceIdsInOrder,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    // Bulk write updates for each instance
    const bulkOps = instanceIdsInOrder.map((id, index) => ({
      updateOne: {
        filter: { _id: id, organization: org._id, page: cleanPage },
        update: { $set: { order: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await ComponentInstance.bulkWrite(bulkOps);
    }

    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function removeComponentInstanceAction(
  organizationId: string,
  instanceId: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = RemoveComponentInstanceSchema.safeParse({
      organizationId,
      instanceId,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const result = await ComponentInstance.deleteOne({
      _id: instanceId,
      organization: org._id,
    });

    if (result.deletedCount === 0) {
      return { success: false, error: "Component instance not found or already deleted." };
    }

    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}
