import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireEditor } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentInstance } from "@/models/ComponentInstance";
import type { ComponentTypeDoc } from "@/models/ComponentType";
import type { FieldDefinition } from "@/lib/field-types";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { InstanceForm, type InstanceData } from "@/app/dashboard/_fields/InstanceForm";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const user = await requireEditor();

  // Editors must belong to an org; the proxy already keeps non-editors'
  // superadmin areas separate, and superadmins edit structure elsewhere.
  if (!user.organization) {
    redirect("/dashboard");
  }

  await connectDB();

  const docs = await ComponentInstance.find({
    organization: user.organization,
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
          title={`~/cms/${page}.page`}
          redirectUrl="/dashboard"
          defaultMaxWidth="max-w-4xl"
        >
          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h1 className="text-xl font-bold">
                  {page}
                  <span className="text-[var(--color-muted)]">.page</span>
                </h1>
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
