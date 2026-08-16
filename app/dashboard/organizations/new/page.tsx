import { requireSuperadmin } from "@/lib/auth";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { NewOrganizationForm } from "./_components/NewOrganizationForm";

export default async function NewOrganizationPage() {
  await requireSuperadmin();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <TerminalWindow title="~/cms/organizations/new" redirectUrl="/dashboard/organizations" defaultMaxWidth="max-w-3xl">
          <div className="p-6 space-y-6">
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
                <span className="text-xs text-[var(--color-accent)]">create</span>
              </div>
              <h1 className="text-xl font-bold text-[var(--color-foreground)] mt-1">
                Create Organization
              </h1>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Register a new client company or individual to auto-generate their public API key.
              </p>
            </div>

            <NewOrganizationForm />
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}
