"use server";

import { z } from "zod";
import crypto from "crypto";
import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ComponentType } from "@/models/ComponentType";
import { ComponentInstance } from "@/models/ComponentInstance";
import { revalidatePath } from "next/cache";

const OrganizationInputSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  type: z.enum(["COMPANY", "INDIVIDUAL"], {
    message: "Type must be either COMPANY or INDIVIDUAL",
  }),
  ownerEmail: z
    .string()
    .trim()
    .min(1, "Owner email is required")
    .email("Invalid owner email address"),
});

export type OrganizationInput = z.infer<typeof OrganizationInputSchema>;

export type ActionResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type CreatedOrganizationData = {
  id: string;
  name: string;
  slug: string;
  type: "COMPANY" | "INDIVIDUAL";
  ownerEmail: string;
  publicApiKey: string;
};

export async function createOrganizationAction(
  rawInput: unknown
): Promise<ActionResponse<CreatedOrganizationData>> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = OrganizationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const { name, slug, type, ownerEmail } = parsed.data;

    // Check duplicate slug in DB
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return {
        success: false,
        error: `Organization slug '${slug}' is already in use. Slugs must be unique.`,
      };
    }

    const org = await Organization.create({
      name,
      slug,
      type,
      ownerEmail: ownerEmail.toLowerCase(),
    });

    revalidatePath("/dashboard/organizations");

    return {
      success: true,
      data: {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        type: org.type,
        ownerEmail: org.ownerEmail,
        publicApiKey: org.publicApiKey,
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

const InviteEditorSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  email: z
    .string()
    .trim()
    .min(1, "Editor email is required")
    .email("Invalid editor email address"),
});

export async function inviteEditorAction(
  organizationId: string,
  email: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = InviteEditorSchema.safeParse({ organizationId, email });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      if (existingUser.role === "SUPERADMIN") {
        return {
          success: false,
          error: `User '${cleanEmail}' is a Superadmin and cannot be attached as an editor.`,
        };
      }

      if (
        existingUser.organization &&
        existingUser.organization.toString() !== org._id.toString()
      ) {
        const attachedOrg = await Organization.findById(existingUser.organization);
        const attachedOrgName = attachedOrg ? attachedOrg.name : "another organization";
        return {
          success: false,
          error: `Conflict: User '${cleanEmail}' is already attached to ${attachedOrgName} (${attachedOrg?.slug || "another org"}). An editor cannot be attached to multiple organizations.`,
        };
      }

      existingUser.role = "EDITOR";
      existingUser.organization = org._id;
      await existingUser.save();
    } else {
      await User.create({
        email: cleanEmail,
        role: "EDITOR",
        organization: org._id,
        magicIssuer: null,
      });
    }

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return {
      success: true,
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function removeEditorAction(
  organizationId: string,
  userId: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found." };
    }

    if (user.organization?.toString() === organizationId) {
      user.organization = null;
      await user.save();
    }

    const org = await Organization.findById(organizationId);
    if (org) {
      revalidatePath(`/dashboard/organizations/${org.slug}`);
    }
    revalidatePath("/dashboard/organizations");

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function regenerateApiKeyAction(
  organizationId: string
): Promise<ActionResponse<{ publicApiKey: string }>> {
  try {
    await requireSuperadmin();
    await connectDB();

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const newApiKey = crypto.randomBytes(24).toString("hex");
    org.publicApiKey = newApiKey;
    await org.save();

    // TODO: Verify that regenerating publicApiKey immediately invalidates the old key once Task 7's public API is implemented.

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return {
      success: true,
      data: { publicApiKey: newApiKey },
    };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/* --- Task 4: Component Instance Management Server Actions --- */

const AssignComponentSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  componentTypeId: z.string().trim().min(1, "Component type is required"),
  page: z
    .string()
    .trim()
    .min(1, "Page name is required")
    .regex(/^[a-z0-9\-_/]+$/i, "Page name must contain valid URL slug characters"),
});

export async function assignComponentAction(
  organizationId: string,
  componentTypeId: string,
  page: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const cleanPage = page.trim().toLowerCase();

    const parsed = AssignComponentSchema.safeParse({
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
      return { success: false, error: "Component type blueprint not found." };
    }

    // Determine next order on this page
    const lastInstance = await ComponentInstance.findOne({
      organization: org._id,
      page: cleanPage,
    }).sort({ order: -1 });

    const nextOrder = lastInstance ? lastInstance.order + 1 : 0;

    await ComponentInstance.create({
      organization: org._id,
      componentType: compType._id,
      page: cleanPage,
      order: nextOrder,
      values: [], // Values start empty; editors fill them in via Task 5's UI
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

export async function reorderInstancesAction(
  organizationId: string,
  page: string,
  orderedInstanceIds: string[]
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const cleanPage = page.trim().toLowerCase();

    // Update order for each instance in the page
    const updatePromises = orderedInstanceIds.map((instanceId, idx) =>
      ComponentInstance.updateOne(
        {
          _id: instanceId,
          organization: org._id,
          page: cleanPage,
        },
        { $set: { order: idx } }
      )
    );

    await Promise.all(updatePromises);

    revalidatePath(`/dashboard/organizations/${org.slug}`);

    return { success: true };
  } catch (err) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function removeInstanceAction(
  organizationId: string,
  instanceId: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const deleted = await ComponentInstance.findOneAndDelete({
      _id: instanceId,
      organization: org._id,
    });

    if (!deleted) {
      return { success: false, error: "Component instance not found." };
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
