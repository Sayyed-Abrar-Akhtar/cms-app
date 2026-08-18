import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireEditor, ForbiddenError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ComponentInstance } from "@/models/ComponentInstance";
import type { ComponentTypeDoc } from "@/models/ComponentType";
import type { FieldDefinition } from "@/lib/field-types";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { InstanceForm, type InstanceData } from "@/app/dashboard/_fields/InstanceForm";

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
        <TerminalWindow
          title={`~/cms/${orgSlug}/${page}.page`}
          redirectUrl="/dashboard"
          defaultMaxWidth="max-w-4xl"
        >
          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    {page}
                    <span className="text-[var(--color-muted)]">.page</span>
                  </h1>
                  <span className="rounded bg-[var(--color-accent-dim)] px-2 py-0.5 text-xs text-[var(--color-accent)] font-semibold">
                    {org.name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {instances.length} component{instances.length === 1 ? "" : "s"} —
                  fill in the values, then Save changes on each one.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-border)]"
              >
                ← All pages
              </Link>
            </div>

            {instances.map((instance) => (
              <InstanceForm key={instance.id} instance={instance} />
            ))}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
