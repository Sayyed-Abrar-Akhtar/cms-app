import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { ComponentInstance } from "@/models/ComponentInstance";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;

  await connectDB();

  // Fetch organizations for EDITOR (or if user has organizations)
  const userOrgIds = user.organizations ?? [];
  const orgDocs = userOrgIds.length > 0
    ? await Organization.find({ _id: { $in: userOrgIds } }).lean()
    : [];

  // For each organization, find distinct page names in ComponentInstance
  const orgsWithPages = await Promise.all(
    orgDocs.map(async (org) => {
      const pageNames = await ComponentInstance.distinct("page", {
        organization: org._id,
      });
      return {
        id: String(org._id),
        name: org.name,
        slug: org.slug,
        type: org.type,
        pages: (pageNames as string[]).sort(),
      };
    })
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <TerminalWindow title="~/cms/dashboard" redirectUrl="/" defaultMaxWidth="max-w-4xl">
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-950/30 border border-[var(--color-danger)]/40 rounded text-xs text-[var(--color-danger)]">
                [error] {error}
              </div>
            )}

            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                  Welcome, {user.email}
                </h1>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  ROLE: <span className="text-[var(--color-accent)]">{user.role}</span>
                </p>
              </div>

              <a
                href="/api/auth/logout"
                className="py-1.5 px-3 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] transition-colors"
              >
                Log out
              </a>
            </div>

            {/* Role-based Dashboard Views */}
            {user.role === "SUPERADMIN" ? (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-[var(--color-accent)]">
                  Superadmin Controls
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/dashboard/components"
                    className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors block"
                  >
                    <div className="text-sm font-bold text-[var(--color-foreground)]">
                      ▣ Component Types
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      Manage component type schemas & blueprints.
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/organizations"
                    className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors block"
                  >
                    <div className="text-sm font-bold text-[var(--color-foreground)]">
                      ▤ Organizations
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      Manage client organizations & editor access.
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orgsWithPages.length === 0 ? (
                  <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-warning)]/40 rounded text-xs space-y-2">
                    <div className="font-semibold text-[var(--color-warning)]">
                      [notice] Not yet assigned to an organization
                    </div>
                    <p className="text-[var(--color-muted)]">
                      Your editor account is active, but you are not yet assigned to an organization — contact your admin.
                    </p>
                  </div>
                ) : orgsWithPages.length === 1 ? (
                  /* Single Organization View: directly show pages */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-[var(--color-accent)]">
                        Organization Content Editor
                      </h2>
                      <span className="text-xs text-[var(--color-muted)] font-mono">
                        {orgsWithPages[0].name}{" "}
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-accent-dim)] text-[var(--color-accent)] ml-1 uppercase">
                          {orgsWithPages[0].type}
                        </span>
                      </span>
                    </div>

                    {orgsWithPages[0].pages.length === 0 ? (
                      <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-muted)]">
                        No pages assigned to this organization yet. Contact your admin to add component instances.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--color-muted)]">Select a page to edit content values:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {orgsWithPages[0].pages.map((p) => (
                            <Link
                              key={p}
                              href={`/dashboard/${orgsWithPages[0].slug}/${p}`}
                              className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors block text-xs"
                            >
                              <div className="font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                                <span>📄</span> {p}
                              </div>
                              <div className="text-[var(--color-muted)] text-[10px] mt-1">
                                ~/cms/{orgsWithPages[0].slug}/{p}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Multi Organization View: list organizations with badges and their pages */
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-[var(--color-accent)]">
                      Your Organizations ({orgsWithPages.length})
                    </h2>
                    <div className="space-y-4">
                      {orgsWithPages.map((org) => (
                        <div
                          key={org.id}
                          className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-2">
                            <span className="font-bold text-sm text-[var(--color-foreground)]">
                              ▤ {org.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-accent-dim)] text-[var(--color-accent)] uppercase font-semibold">
                              {org.type}
                            </span>
                          </div>

                          {org.pages.length === 0 ? (
                            <p className="text-xs text-[var(--color-muted)] italic">
                              No pages assigned yet.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[11px] text-[var(--color-muted)]">Pages:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {org.pages.map((p) => (
                                  <Link
                                    key={p}
                                    href={`/dashboard/${org.slug}/${p}`}
                                    className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors block text-xs"
                                  >
                                    <div className="font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                                      <span>📄</span> {p}
                                    </div>
                                    <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                                      /dashboard/{org.slug}/{p}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
