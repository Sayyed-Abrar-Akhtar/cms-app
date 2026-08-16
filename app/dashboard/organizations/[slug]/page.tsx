import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { ApiKeyCard } from "./_components/ApiKeyCard";
import { InviteEditorForm } from "./_components/InviteEditorForm";
import { EditorList } from "./_components/EditorList";

export const revalidate = 0;

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
    organization: org._id,
    role: "EDITOR",
  })
    .sort({ createdAt: -1 })
    .lean();

  const serializedEditors = editors.map((e) => ({
    id: e._id.toString(),
    email: e.email,
    createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
  }));

  const orgIdStr = org._id.toString();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <TerminalWindow
          title={`~/cms/organizations/${org.slug}`}
          redirectUrl="/dashboard/organizations"
          defaultMaxWidth="max-w-4xl"
        >
          <div className="p-6 space-y-6">
            {/* Header / Breadcrumb */}
            <div className="border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  ← dashboard
                </Link>
                <span className="text-xs text-[var(--color-muted)]">/</span>
                <Link
                  href="/dashboard/organizations"
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  organizations
                </Link>
                <span className="text-xs text-[var(--color-muted)]">/</span>
                <span className="text-xs text-[var(--color-accent)]">{org.slug}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                      {org.name}
                    </h1>
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                        org.type === "COMPANY"
                          ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                          : "bg-purple-950/40 text-purple-300 border-purple-800/40"
                      }`}
                    >
                      {org.type}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--color-muted)] mt-1 space-x-4">
                    <span>
                      slug: <span className="text-[var(--color-foreground)]">{org.slug}</span>
                    </span>
                    <span>
                      owner: <span className="text-[var(--color-foreground)]">{org.ownerEmail}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Public API Key Card */}
            <ApiKeyCard
              organizationId={orgIdStr}
              initialApiKey={org.publicApiKey}
              slug={org.slug}
            />

            {/* Editor List Section */}
            <EditorList organizationId={orgIdStr} editors={serializedEditors} />

            {/* Invite Editor Form Section */}
            <InviteEditorForm organizationId={orgIdStr} />
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
