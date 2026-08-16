import { requireSuperadmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ComponentType } from "@/models/ComponentType";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

export const revalidate = 0;

export default async function ComponentTypesListPage() {
  await requireSuperadmin();
  await connectDB();

  const componentTypes = await ComponentType.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <TerminalWindow title="~/cms/components" redirectUrl="/dashboard" defaultMaxWidth="max-w-5xl">
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
                  <span className="text-xs text-[var(--color-accent)]">components</span>
                </div>
                <h1 className="text-xl font-bold text-[var(--color-foreground)] mt-1">
                  Component Types
                </h1>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Reusable blueprints and field definitions for page elements.
                </p>
              </div>

              <Link
                href="/dashboard/components/new"
                className="inline-flex items-center justify-center py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                + Create component type
              </Link>
            </div>

            {componentTypes.length === 0 ? (
              <div className="p-8 text-center bg-[var(--color-surface-hover)] border border-dashed border-[var(--color-border)] rounded-lg space-y-3">
                <div className="text-sm font-semibold text-[var(--color-foreground)]">
                  No component types created yet
                </div>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                  Create your first component type blueprint to define structural fields for banners, project cards, or custom blocks.
                </p>
                <div>
                  <Link
                    href="/dashboard/components/new"
                    className="inline-flex items-center py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
                  >
                    Create component type
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {componentTypes.map((ct) => (
                  <Link
                    key={ct._id.toString()}
                    href={`/dashboard/components/${ct.slug}`}
                    className="group bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-lg p-5 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-accent)] transition-colors">
                          {ct.name}
                        </div>
                        {ct.isRepeatable && (
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[var(--color-accent-dim)] text-[var(--color-accent)] border border-[var(--color-accent)]/30">
                            Repeatable
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[var(--color-muted)] font-mono">
                        slug: <span className="text-[var(--color-foreground)]">{ct.slug}</span>
                      </div>

                      {ct.description && (
                        <p className="text-xs text-[var(--color-muted)] line-clamp-2 font-sans">
                          {ct.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted)]">
                      <span>{ct.fields?.length || 0} field{(ct.fields?.length || 0) === 1 ? "" : "s"}</span>
                      <span className="text-[var(--color-accent)] group-hover:translate-x-0.5 transition-transform">
                        Edit config →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
