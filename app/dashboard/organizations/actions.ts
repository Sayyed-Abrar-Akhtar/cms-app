"use server";

import { z } from "zod";
import crypto from "crypto";
import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { sendEditorInviteEmail } from "@/lib/email";
import { revalidatePath, revalidateTag } from "next/cache";

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
  warning?: string;
  message?: string;
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
  name: z.string().trim().optional(),
});

export async function inviteEditorAction(
  organizationId: string,
  email: string,
  name?: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const parsed = InviteEditorSchema.safeParse({ organizationId, email, name });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue ? firstIssue.message : "Validation failed",
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      parsed.data.name && parsed.data.name.trim().length > 0
        ? parsed.data.name.trim()
        : undefined;

    const org = await Organization.findById(organizationId);
    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    let recipientName: string | undefined = cleanName;

    if (existingUser) {
      if (existingUser.role === "SUPERADMIN") {
        return {
          success: false,
          error: `User '${cleanEmail}' is a Superadmin and cannot be attached as an editor.`,
        };
      }

      if (!existingUser.organizations) {
        existingUser.organizations = [];
      }

      const isAlreadyAttached = existingUser.organizations.some(
        (id) => id.toString() === org._id.toString()
      );

      if (isAlreadyAttached) {
        return {
          success: true,
          message: `User '${cleanEmail}' is already attached to this organization.`,
        };
      }

      if (!existingUser.name && cleanName) {
        existingUser.name = cleanName;
      }

      recipientName = existingUser.name || cleanName;

      existingUser.role = "EDITOR";
      existingUser.organizations.push(org._id);
      await existingUser.save();
    } else {
      await User.create({
        email: cleanEmail,
        name: cleanName || null,
        role: "EDITOR",
        organizations: [org._id],
        magicIssuer: null,
      });
    }

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${org.slug}`);

    // Send email notification for new attachment
    const emailResult = await sendEditorInviteEmail({
      to: cleanEmail,
      organizationName: org.name,
      name: recipientName,
    });

    if (!emailResult.success) {
      console.error(
        `Failed to send editor invite email to ${cleanEmail}:`,
        emailResult.error
      );
      return {
        success: true,
        warning:
          "Editor added, but the notification email failed to send — share the login link with them directly.",
      };
    }

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

    if (user.organizations && user.organizations.length > 0) {
      user.organizations = user.organizations.filter(
        (id) => id.toString() !== organizationId
      );
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

export async function resetEditorQuotaAction(
  userId: string,
  organizationId?: string
): Promise<ActionResponse> {
  try {
    await requireSuperadmin();
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "Editor not found." };
    }

    user.updatesUsedInPeriod = 0;
    user.quotaPeriodStart = new Date();
    await user.save();

    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (org) {
        revalidatePath(`/dashboard/organizations/${org.slug}`);
      }
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

    revalidateTag(`public-api-${org.slug}`, "max");
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
