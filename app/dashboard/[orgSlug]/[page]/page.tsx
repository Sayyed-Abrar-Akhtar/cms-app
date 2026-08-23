import { notFound } from "next/navigation";
import { requireEditor, ForbiddenError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ComponentInstance } from "@/models/ComponentInstance";
import { ComponentType, type ComponentTypeDoc } from "@/models/ComponentType";
import type { FieldDefinition } from "@/lib/field-types";
import { type InstanceData } from "@/app/dashboard/_fields/InstanceForm";
import { EditorPageClient, type RepeatableTypeOption } from "./EditorPageClient";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ orgSlug: string; page: string }>;
}) {
  const { orgSlug, page } = await params;
  const user = await requireEditor();

  await connectDB();

  // Find organization by slug
  const org = await Organization.findOne({ slug: orgSlug }).lean();
  if (!org) {
    notFound();
  }

  // Server-side security check:
  // For EDITORS, verify that the org's ObjectId is in the editor's `organizations` array.
  // Never trust the URL alone.
  if (user.role === "EDITOR") {
    const userOrgs = user.organizations ?? [];
    const isMember = userOrgs.some(
      (orgId) => orgId.toString() === String(org._id)
    );

    if (!isMember) {
      throw new ForbiddenError(
        "Forbidden: You are not a member of this organization."
      );
    }
  }

  const docs = await ComponentInstance.find({
    organization: org._id,
    page,
  })
    .sort({ order: 1 })
    .populate("componentType")
    .lean();

  if (docs.length === 0) {
    notFound();
  }

  // Fetch available repeatable component types
  const repeatableTypeDocs = await ComponentType.find({ isRepeatable: true }).lean();
  const repeatableTypes: RepeatableTypeOption[] = repeatableTypeDocs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
  }));

  // Calculate quota info if editor
  let quotaInfo: { remaining: number; quota: number } | null = null;
  if (user.role === "EDITOR") {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const periodStart = user.quotaPeriodStart ? new Date(user.quotaPeriodStart).getTime() : now.getTime();

    let used = user.updatesUsedInPeriod ?? 0;
    if (now.getTime() >= periodStart + THIRTY_DAYS_MS) {
      used = 0;
    }
    const quota = user.updateQuota ?? 30;
    const remaining = Math.max(0, quota - used);
    quotaInfo = { remaining, quota };
  }

  const instances: InstanceData[] = docs.map((doc) => {
    const type = doc.componentType as unknown as ComponentTypeDoc | null;
    const values: Record<string, unknown> = {};
    for (const entry of doc.values ?? []) {
      values[entry.key] = entry.value;
    }
    return {
      id: String(doc._id),
      order: doc.order,
      typeName: type?.name ?? "Unknown component",
      typeSlug: type?.slug ?? "unknown",
      isRepeatable: type?.isRepeatable ?? false,
      fields: (type?.fields ?? []) as FieldDefinition[],
      values,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6 font-mono text-[var(--color-foreground)]">
      <div className="mx-auto max-w-4xl space-y-6">
        <EditorPageClient
          orgSlug={orgSlug}
          orgName={org.name}
          page={page}
          instances={instances}
          repeatableTypes={repeatableTypes}
          quotaInfo={quotaInfo}
        />
      </div>
    </div>
  );
}
