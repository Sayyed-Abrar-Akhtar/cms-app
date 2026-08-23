"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { NewOrganizationForm } from "./NewOrganizationForm";

export function NewOrganizationClient() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);

  const handleNavigateBack = (targetUrl: string = "/dashboard/organizations") => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmLeave) return;
    }
    router.push(targetUrl);
  };

  return (
    <TerminalWindow
      title="~/cms/organizations/new"
      onClose={() => handleNavigateBack("/dashboard/organizations")}
      defaultMaxWidth="max-w-3xl"
    >
      <div className="p-6 space-y-6">
        <div className="border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigateBack("/dashboard")}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
            >
              ← dashboard
            </button>
            <span className="text-xs text-[var(--color-muted)]">/</span>
            <button
              type="button"
              onClick={() => handleNavigateBack("/dashboard/organizations")}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
            >
              organizations
            </button>
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

        <NewOrganizationForm
          onDirtyChange={(dirty) => setIsDirty(dirty)}
          onCancel={() => handleNavigateBack("/dashboard/organizations")}
        />
      </div>
    </TerminalWindow>
  );
}
