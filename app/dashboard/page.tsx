import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { connectDB } from "@/lib/mongodb";
import { ComponentInstance } from "@/models/ComponentInstance";

async function getEditorPages(organizationId: unknown) {
  await connectDB();
  const rows = await ComponentInstance.aggregate<{
    _id: string;
    count: number;
  }>([
    { $match: { organization: organizationId } },
    { $group: { _id: "$page", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ page: row._id, count: row.count }));
}

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
                {!user.organization ? (
                  <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-warning)]/40 rounded text-xs space-y-2">
                    <div className="font-semibold text-[var(--color-warning)]">
                      [notice] Not yet assigned to an organization
                    </div>
                    <p className="text-[var(--color-muted)]">
                      Your editor account is active, but you are not yet assigned to an organization — contact your admin.
                    </p>
                  </div>
                ) : (
                  <EditorPageList organizationId={user.organization} />
                )}
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}

async function EditorPageList({
  organizationId,
}: {
  organizationId: unknown;
}) {
  const pages = await getEditorPages(organizationId);

  if (pages.length === 0) {
    return (
      <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs space-y-2">
        <div className="font-semibold text-[var(--color-muted)]">
          No components assigned yet
        </div>
        <p className="text-[var(--color-muted)]">
          Your admin hasn&apos;t placed any components on your pages — once
          they do, each page shows up here for you to fill in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-accent)]">
        Your pages
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pages.map(({ page, count }) => (
          <Link
            key={page}
            href={`/dashboard/${encodeURIComponent(page)}`}
            className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded hover:border-[var(--color-accent)] transition-colors block"
          >
            <div className="text-sm font-bold text-[var(--color-foreground)]">
              ▤ {page}
              <span className="text-[var(--color-muted)]">.page</span>
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              {count} component{count === 1 ? "" : "s"} to fill in.
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
