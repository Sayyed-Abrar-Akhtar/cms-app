import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

export const revalidate = 0;

export default async function OrganizationsListPage() {
  await requireSuperadmin();
  await connectDB();

  const organizations = await Organization.find().sort({ createdAt: -1 }).lean();

  const orgIds = organizations.map((o) => o._id);
  const editors = await User.find({
    organization: { $in: orgIds },
    role: "EDITOR",
  }).lean();

  const editorCountMap: Record<string, number> = {};
  editors.forEach((editor) => {
    if (editor.organization) {
      const key = editor.organization.toString();
      editorCountMap[key] = (editorCountMap[key] || 0) + 1;
    }
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <TerminalWindow title="~/cms/organizations" redirectUrl="/dashboard" defaultMaxWidth="max-w-5xl">
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                  >
                    ← dashboard
                  </Link>
                  <span className="text-xs text-[var(--color-muted)]">/</span>
                  <span className="text-xs text-[var(--color-accent)]">organizations</span>
                </div>
                <h1 className="text-xl font-bold text-[var(--color-foreground)] mt-1">
                  Organizations
                </h1>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Manage client accounts, API read keys, and editor permissions.
                </p>
              </div>

              <Link
                href="/dashboard/organizations/new"
                className="inline-flex items-center justify-center py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                + Create organization
              </Link>
            </div>

            {organizations.length === 0 ? (
              <div className="p-8 text-center bg-[var(--color-surface-hover)] border border-dashed border-[var(--color-border)] rounded-lg space-y-3">
                <div className="text-sm font-semibold text-[var(--color-foreground)]">
                  No organizations created yet
                </div>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                  Create your first organization account for a client company or individual to issue API keys and invite editors.
                </p>
                <div>
                  <Link
                    href="/dashboard/organizations/new"
                    className="inline-flex items-center py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
                  >
                    Create organization
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organizations.map((org) => {
                  const orgIdStr = org._id.toString();
                  const editorCount = editorCountMap[orgIdStr] || 0;

                  return (
                    <Link
                      key={orgIdStr}
                      href={`/dashboard/organizations/${org.slug}`}
                      className="group bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg p-5 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-accent)] transition-colors">
                            {org.name}
                          </div>
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

                        <div className="text-xs text-[var(--color-muted)] font-mono space-y-0.5">
                          <div>
                            slug: <span className="text-[var(--color-foreground)]">{org.slug}</span>
                          </div>
                          <div>
                            owner: <span className="text-[var(--color-foreground)]">{org.ownerEmail}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted)]">
                        <span>
                          {editorCount} editor{editorCount === 1 ? "" : "s"} attached
                        </span>
                        <span className="text-[var(--color-accent)] group-hover:translate-x-0.5 transition-transform">
                          Manage organization →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
