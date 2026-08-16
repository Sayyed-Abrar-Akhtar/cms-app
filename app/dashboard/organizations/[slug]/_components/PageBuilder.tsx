"use client";

import { useState } from "react";
import {
  assignComponentAction,
  reorderInstancesAction,
  removeInstanceAction,
} from "@/app/dashboard/organizations/actions";

export interface ComponentTypeBlueprint {
  id: string;
  name: string;
  slug: string;
  isRepeatable: boolean;
  fieldsCount: number;
}

export interface ComponentInstanceItem {
  id: string;
  page: string;
  order: number;
  componentType: ComponentTypeBlueprint;
}

interface PageBuilderProps {
  organizationId: string;
  componentTypes: ComponentTypeBlueprint[];
  instances: ComponentInstanceItem[];
}

export function PageBuilder({
  organizationId,
  componentTypes,
  instances: initialInstances,
}: PageBuilderProps) {
  // Extract distinct page names (e.g. ["home"])
  const existingPages = Array.from(
    new Set(["home", ...initialInstances.map((i) => i.page)])
  ).sort();

  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageInput, setNewPageInput] = useState("");

  const [selectedCompTypeId, setSelectedCompTypeId] = useState<string>(
    componentTypes[0]?.id || ""
  );

  const effectiveCompTypeId = componentTypes.some((ct) => ct.id === selectedCompTypeId)
    ? selectedCompTypeId
    : componentTypes[0]?.id || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  // Filter and sort instances for currently selected page
  const pageInstances = initialInstances
    .filter((inst) => inst.page === selectedPage)
    .sort((a, b) => a.order - b.order);

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const targetPage = isCreatingPage
      ? newPageInput.trim().toLowerCase().replace(/[^a-z0-9-/]/g, "")
      : selectedPage;

    if (!targetPage) {
      setError("Please provide a valid page name.");
      return;
    }

    if (!effectiveCompTypeId) {
      setError("Please select a component type blueprint.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await assignComponentAction(
        organizationId,
        effectiveCompTypeId,
        targetPage
      );

      if (!res.success) {
        setError(res.error || "Failed to assign component instance.");
      } else {
        const addedType = componentTypes.find((ct) => ct.id === effectiveCompTypeId);
        setSuccessMsg(
          `Assigned '${addedType?.name || "Component"}' instance to page '${targetPage}'.`
        );
        setSelectedPage(targetPage);
        setIsCreatingPage(false);
        setNewPageInput("");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError("An unexpected error occurred while assigning component.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === pageInstances.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...pageInstances];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const orderedIds = updated.map((i) => i.id);

    try {
      const res = await reorderInstancesAction(organizationId, selectedPage, orderedIds);
      if (!res.success) {
        setError(res.error || "Failed to persist reordering.");
      }
    } catch {
      setError("An unexpected error occurred while reordering.");
    }
  };

  const handleRemove = async (instanceId: string) => {
    setError(null);
    setIsRemovingId(instanceId);

    try {
      const res = await removeInstanceAction(organizationId, instanceId);
      if (!res.success) {
        setError(res.error || "Failed to remove component instance.");
      } else {
        setConfirmRemoveId(null);
        setSuccessMsg("Component instance and its values were permanently deleted.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError("An unexpected error occurred while removing component instance.");
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <div className="p-5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg space-y-6 font-mono text-xs">
      <div className="border-b border-[var(--color-border)] pb-3">
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          Page Layout Builder (Component Assignments)
        </h2>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5 font-sans">
          Assign structural component blueprints to client pages and reorder them. Field values start empty for client editors to complete.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-danger)]/50 rounded text-xs text-[var(--color-danger)]">
          [error] {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[var(--color-accent-dim)]/40 border border-[var(--color-accent)]/50 rounded text-xs text-[var(--color-accent)]">
          [success] {successMsg}
        </div>
      )}

      {/* Page Tabs */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
          Pages
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {existingPages.map((pageName) => {
            const isActive = selectedPage === pageName && !isCreatingPage;
            const count = initialInstances.filter((i) => i.page === pageName).length;

            return (
              <button
                key={pageName}
                type="button"
                onClick={() => {
                  setSelectedPage(pageName);
                  setIsCreatingPage(false);
                }}
                className={`py-1.5 px-3 rounded text-xs font-mono transition-colors flex items-center gap-2 border ${
                  isActive
                    ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-bold"
                    : "bg-[var(--color-surface)] hover:bg-[var(--color-border)] border-[var(--color-border)] text-[var(--color-foreground)]"
                }`}
              >
                <span>/{pageName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    isActive
                      ? "bg-black/20 text-black font-bold"
                      : "bg-[var(--color-border)] text-[var(--color-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setIsCreatingPage(true);
              setNewPageInput("");
            }}
            className={`py-1.5 px-3 rounded text-xs font-mono transition-colors border ${
              isCreatingPage
                ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] font-bold"
                : "bg-transparent hover:bg-[var(--color-surface)] border-dashed border-[var(--color-border)] text-[var(--color-accent)]"
            }`}
          >
            + Add new page
          </button>
        </div>
      </div>

      {/* Add Component Form */}
      <form onSubmit={handleAddComponent} className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg space-y-4">
        <div className="font-bold text-xs text-[var(--color-foreground)]">
          + Add component to page
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Page */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[var(--color-muted)]">
              Target Page
            </label>
            {isCreatingPage ? (
              <input
                type="text"
                required
                value={newPageInput}
                onChange={(e) => setNewPageInput(e.target.value)}
                placeholder="e.g. about or projects"
                className="w-full p-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
              />
            ) : (
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="w-full p-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
              >
                {existingPages.map((p) => (
                  <option key={p} value={p}>
                    /{p}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Component Type Blueprint */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[var(--color-muted)]">
              Component Blueprint
            </label>
            {componentTypes.length === 0 ? (
              <div className="p-2 text-[11px] text-[var(--color-warning)] font-mono">
                No component types created yet. Create component types first in /dashboard/components.
              </div>
            ) : (
              <select
                value={effectiveCompTypeId}
                onChange={(e) => setSelectedCompTypeId(e.target.value)}
                className="w-full p-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
              >
                {componentTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name} ({ct.slug}){ct.isRepeatable ? " [Repeatable]" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-[var(--color-muted)] font-sans">
            Appends component blueprint to page with empty values.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || componentTypes.length === 0}
            className="py-2 px-4 bg-[var(--color-accent)] text-black font-bold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add component"}
          </button>
        </div>
      </form>

      {/* Component Instance List for Selected Page */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
            Components on /{selectedPage} ({pageInstances.length})
          </h3>
        </div>

        {pageInstances.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-[var(--color-border)] rounded text-[11px] text-[var(--color-muted)]">
            No component instances assigned to /{selectedPage} yet — pick a component type above to assign one.
          </div>
        ) : (
          <div className="space-y-2">
            {pageInstances.map((inst, index) => {
              const isConfirming = confirmRemoveId === inst.id;
              const isRemoving = isRemovingId === inst.id;

              return (
                <div
                  key={inst.id}
                  className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--color-muted)] w-6 text-center">
                      #{index + 1}
                    </span>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-foreground)] text-xs">
                          {inst.componentType.name}
                        </span>
                        {inst.componentType.isRepeatable ? (
                          <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-[var(--color-accent-dim)] text-[var(--color-accent)] border border-[var(--color-accent)]/30">
                            Repeatable
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Fixed
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-[var(--color-muted)]">
                        slug: <span className="text-[var(--color-foreground)]">{inst.componentType.slug}</span> • {inst.componentType.fieldsCount} field{inst.componentType.fieldsCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Reorder up/down */}
                    <div className="flex items-center border border-[var(--color-border)] rounded overflow-hidden">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "up")}
                        title="Move Up"
                        className="py-1 px-2.5 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-30 border-r border-[var(--color-border)] text-xs transition-colors"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === pageInstances.length - 1}
                        onClick={() => handleMove(index, "down")}
                        title="Move Down"
                        className="py-1 px-2.5 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] disabled:opacity-30 text-xs transition-colors"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Remove Action */}
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 bg-red-950/40 p-1 rounded border border-[var(--color-danger)]/50">
                        <span className="text-[10px] text-[var(--color-danger)] font-bold px-1">
                          Delete component &amp; all values?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(inst.id)}
                          disabled={isRemoving}
                          className="py-1 px-2 bg-[var(--color-danger)] text-black font-bold rounded text-[10px] hover:bg-[var(--color-danger)]/90 transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? "Deleting..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="py-1 px-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded text-[10px] hover:bg-[var(--color-border)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(inst.id)}
                        className="py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 border border-[var(--color-danger)]/40 text-[var(--color-danger)] rounded text-xs transition-colors font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
