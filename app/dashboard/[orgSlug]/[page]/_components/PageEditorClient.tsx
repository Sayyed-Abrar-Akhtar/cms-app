"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { InstanceForm, type InstanceData } from "@/app/dashboard/_fields/InstanceForm";

export interface PageEditorClientProps {
  orgSlug: string;
  page: string;
  orgName: string;
  quotaInfo: { remaining: number; quota: number } | null;
  instances: InstanceData[];
}

export function PageEditorClient({
  orgSlug,
  page,
  orgName,
  quotaInfo,
  instances,
}: PageEditorClientProps) {
  const router = useRouter();
  const [dirtyInstanceIds, setDirtyInstanceIds] = useState<Set<string>>(new Set());

  const handleDirtyChange = (instanceId: string, isDirty: boolean) => {
    setDirtyInstanceIds((prev) => {
      const next = new Set(prev);
      if (isDirty) {
        next.add(instanceId);
      } else {
        next.delete(instanceId);
      }
      return next;
    });
  };

  const hasUnsavedChanges = dirtyInstanceIds.size > 0;

  const handleNavigateBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmLeave) return;
    }
    router.push("/dashboard");
  };

  return (
    <TerminalWindow
      title={`~/cms/${orgSlug}/${page}.page`}
      onClose={handleNavigateBack}
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
                {orgName}
              </span>
              {quotaInfo && (
                <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-foreground)] font-mono">
                  {quotaInfo.remaining} of {quotaInfo.quota} updates left this period
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {instances.length} component{instances.length === 1 ? "" : "s"} —
              fill in the values, then Save changes on each one.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNavigateBack}
            className="rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-border)] cursor-pointer"
          >
            ← All pages
          </button>
        </div>

        {instances.map((instance) => (
          <InstanceForm
            key={instance.id}
            instance={instance}
            onDirtyChange={handleDirtyChange}
          />
        ))}
      </div>
    </TerminalWindow>
  );
}
