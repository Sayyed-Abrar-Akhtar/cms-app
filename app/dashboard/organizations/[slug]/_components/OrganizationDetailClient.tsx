"use client";

import { useRouter } from "next/navigation";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { PageBuilder, type ComponentTypeOption, type SerializedComponentInstance } from "./PageBuilder";
import { ApiKeyCard } from "./ApiKeyCard";
import { EditorList } from "./EditorList";
import { InviteEditorForm } from "./InviteEditorForm";

export interface EditorItemSummary {
  id: string;
  name?: string | null;
  email: string;
  updatesUsedInPeriod?: number;
  updateQuota?: number;
  createdAt: string;
}

export interface OrganizationDetailClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
    type: "COMPANY" | "INDIVIDUAL";
    ownerEmail: string;
    publicApiKey: string;
  };
  editors: EditorItemSummary[];
  componentTypes: ComponentTypeOption[];
  instances: SerializedComponentInstance[];
}

export function OrganizationDetailClient({
  org,
  editors,
  componentTypes,
  instances,
}: OrganizationDetailClientProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/dashboard/organizations");
  };

  const handleNavigateDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <TerminalWindow
      title={`~/cms/organizations/${org.slug}`}
      onClose={handleClose}
      defaultMaxWidth="max-w-4xl"
    >
      <div className="p-6 space-y-6">
        {/* Header / Breadcrumb */}
        <div className="border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateDashboard}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
            >
              ← dashboard
            </button>
            <span className="text-xs text-[var(--color-muted)]">/</span>
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
            >
              organizations
            </button>
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

        {/* Page Builder Section */}
        <PageBuilder
          organizationId={org.id}
          componentTypes={componentTypes}
          instances={instances}
        />

        {/* Public API Key Card */}
        <ApiKeyCard
          organizationId={org.id}
          initialApiKey={org.publicApiKey}
          slug={org.slug}
        />

        {/* Editor List Section */}
        <EditorList organizationId={org.id} editors={editors} />

        {/* Invite Editor Form Section */}
        <InviteEditorForm organizationId={org.id} />
      </div>
    </TerminalWindow>
  );
}
