import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ComponentType } from "@/models/ComponentType";
import { ComponentInstance } from "@/models/ComponentInstance";
import { notFound } from "next/navigation";
import { OrganizationDetailClient } from "./_components/OrganizationDetailClient";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSuperadmin();
  await connectDB();

  const { slug } = await params;

  const org = await Organization.findOne({ slug }).lean();
  if (!org) {
    notFound();
  }

  const editors = await User.find({
    organizations: org._id,
    role: "EDITOR",
  })
    .sort({ createdAt: -1 })
    .lean();

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = new Date();

  const serializedEditors = editors.map((e) => {
    const periodStart = e.quotaPeriodStart ? new Date(e.quotaPeriodStart).getTime() : now.getTime();
    let used = e.updatesUsedInPeriod ?? 0;
    if (now.getTime() >= periodStart + THIRTY_DAYS_MS) {
      used = 0;
    }
    const quota = e.updateQuota ?? 30;

    return {
      id: e._id.toString(),
      name: e.name ?? null,
      email: e.email,
      updatesUsedInPeriod: used,
      updateQuota: quota,
      createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
    };
  });

  const orgIdStr = org._id.toString();

  // Fetch available component types from library
  const componentTypes = await ComponentType.find().sort({ name: 1 }).lean();
  const serializedComponentTypes = componentTypes.map((ct) => ({
    id: ct._id.toString(),
    name: ct.name,
    slug: ct.slug,
    isRepeatable: Boolean(ct.isRepeatable),
    fieldsCount: ct.fields?.length || 0,
  }));

  // Fetch existing component instances for this org
  const instances = await ComponentInstance.find({ organization: org._id })
    .populate("componentType")
    .sort({ page: 1, order: 1 })
    .lean();

  const serializedInstances = instances.map((inst) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ct = inst.componentType as any;
    return {
      id: inst._id.toString(),
      componentTypeId: ct?._id ? ct._id.toString() : inst.componentType.toString(),
      componentTypeName: ct?.name || "Unknown Component",
      componentTypeSlug: ct?.slug || "unknown",
      isRepeatable: ct?.isRepeatable || false,
      page: inst.page || "home",
      order: inst.order ?? 0,
      valuesCount: inst.values?.length || 0,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <OrganizationDetailClient
          org={{
            id: orgIdStr,
            name: org.name,
            slug: org.slug,
            type: org.type,
            ownerEmail: org.ownerEmail,
            publicApiKey: org.publicApiKey,
          }}
          editors={serializedEditors}
          componentTypes={serializedComponentTypes}
          instances={serializedInstances}
        />
      </div>
    </div>
  );
}
