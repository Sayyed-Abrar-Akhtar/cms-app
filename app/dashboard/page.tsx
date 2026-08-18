import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

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
                {!user.organizations || user.organizations.length === 0 ? (
                  <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-warning)]/40 rounded text-xs space-y-2">
                    <div className="font-semibold text-[var(--color-warning)]">
                      [notice] Not yet assigned to an organization
                    </div>
                    <p className="text-[var(--color-muted)]">
                      Your editor account is active, but you are not yet assigned to an organization — contact your admin.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs">
                    <div className="font-semibold text-[var(--color-accent)]">
                      Organization Content Editor
                    </div>
                    <p className="text-[var(--color-muted)] mt-1">
                      Select a page to edit content values.
                    </p>
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
