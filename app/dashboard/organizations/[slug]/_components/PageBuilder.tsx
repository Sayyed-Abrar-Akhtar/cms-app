"use client";

import { useState, useTransition } from "react";
import {
  addComponentInstanceAction,
  reorderComponentInstancesAction,
  removeComponentInstanceAction,
} from "../../page-actions";

export interface ComponentTypeOption {
  id: string;
  name: string;
  slug: string;
  isRepeatable: boolean;
  fieldsCount: number;
}

export interface SerializedComponentInstance {
  id: string;
  componentTypeId: string;
  componentTypeName: string;
  componentTypeSlug: string;
  isRepeatable: boolean;
  page: string;
  order: number;
  valuesCount: number;
}

interface PageBuilderProps {
  organizationId: string;
  componentTypes: ComponentTypeOption[];
  instances: SerializedComponentInstance[];
}

export function PageBuilder({
  organizationId,
  componentTypes,
  instances,
}: PageBuilderProps) {
  // Derive list of pages from instances, ensuring "home" is always present as an option
  const existingPages = Array.from(
    new Set(["home", ...instances.map((i) => i.page)])
  ).sort();

  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [customPage, setCustomPage] = useState<string>("");
  const [isCreatingNewPage, setIsCreatingNewPage] = useState<boolean>(false);

  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    componentTypes[0]?.id || ""
  );

  const [instanceToRemove, setInstanceToRemove] = useState<SerializedComponentInstance | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentPage = isCreatingNewPage
    ? customPage.trim().toLowerCase()
    : selectedPage;

  // Filter instances for current active page
  const pageInstances = instances
    .filter((inst) => inst.page === currentPage)
    .sort((a, b) => a.order - b.order);

  const handlePageSelectChange = (val: string) => {
    setError(null);
    if (val === "__new__") {
      setIsCreatingNewPage(true);
      setCustomPage("");
    } else {
      setIsCreatingNewPage(false);
      setSelectedPage(val);
    }
  };

  const handleAddComponent = () => {
    if (!selectedTypeId) {
      setError("Please select a component type to add.");
      return;
    }
    if (!currentPage) {
      setError("Please specify a valid page name.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await addComponentInstanceAction(
        organizationId,
        selectedTypeId,
        currentPage
      );
      if (!res.success) {
        setError(res.error || "Failed to add component instance.");
      } else {
        if (isCreatingNewPage) {
          setSelectedPage(currentPage);
          setIsCreatingNewPage(false);
          setCustomPage("");
        }
      }
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pageInstances.length) return;

    // Create new order array
    const newOrderList = [...pageInstances];
    const [movedItem] = newOrderList.splice(index, 1);
    newOrderList.splice(targetIndex, 0, movedItem);

    const instanceIdsInOrder = newOrderList.map((item) => item.id);

    setError(null);
    startTransition(async () => {
      const res = await reorderComponentInstancesAction(
        organizationId,
        currentPage,
        instanceIdsInOrder
      );
      if (!res.success) {
        setError(res.error || "Failed to reorder component instances.");
      }
    });
  };

  const handleConfirmRemove = () => {
    if (!instanceToRemove) return;

    setError(null);
    startTransition(async () => {
      const res = await removeComponentInstanceAction(
        organizationId,
        instanceToRemove.id
      );
      if (!res.success) {
        setError(res.error || "Failed to remove component instance.");
      } else {
        setInstanceToRemove(null);
      }
    });
  };

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-surface)] p-6 space-y-6">
      {/* Title & info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <span>▤ Page Layout Builder</span>
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Assign component instances to pages and define their display order.
          </p>
        </div>
        <div className="text-[11px] text-[var(--color-warning)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2.5 py-1 rounded">
          Values start empty; editors fill them in via the editor dashboard.
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-[var(--color-surface-hover)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 rounded">
          {error}
        </div>
      )}

      {/* Page Selector / Creator */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-[var(--color-foreground)] block">
          Select Page
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={isCreatingNewPage ? "__new__" : selectedPage}
            onChange={(e) => handlePageSelectChange(e.target.value)}
            disabled={isPending}
            className="bg-[var(--color-background)] text-[var(--color-foreground)] text-xs border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)]"
          >
            {existingPages.map((p) => (
              <option key={p} value={p}>
                page: /{p}
              </option>
            ))}
            <option value="__new__">+ create new page...</option>
          </select>

          {isCreatingNewPage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">/</span>
              <input
                type="text"
                value={customPage}
                onChange={(e) => setCustomPage(e.target.value.toLowerCase())}
                placeholder="e.g. about or projects"
                disabled={isPending}
                className="bg-[var(--color-background)] text-[var(--color-foreground)] text-xs border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Component Section */}
      <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded p-4 space-y-3">
        <label className="text-xs font-semibold text-[var(--color-foreground)] block">
          Add component to &quot;/{currentPage || "..."}&quot;
        </label>
        {componentTypes.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">
            No component types available in the library yet. Create component types first.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              disabled={isPending}
              className="bg-[var(--color-surface)] text-[var(--color-foreground)] text-xs border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] max-w-xs"
            >
              {componentTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} ({ct.fieldsCount} {ct.fieldsCount === 1 ? "field" : "fields"}
                  {ct.isRepeatable ? ", repeatable" : ""})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddComponent}
              disabled={isPending || !currentPage}
              className="bg-[var(--color-accent)] text-[#0a0a0a] text-xs font-semibold px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Adding..." : "Add component"}
            </button>
          </div>
        )}
      </div>

      {/* Component Instances List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--color-foreground)] uppercase tracking-wider">
            Instances on &quot;/{currentPage}&quot; ({pageInstances.length})
          </h3>
        </div>

        {pageInstances.length === 0 ? (
          <div className="text-xs text-[var(--color-muted)] p-6 text-center border border-dashed border-[var(--color-border)] rounded">
            No components assigned to page &quot;/{currentPage}&quot; yet — pick a component type from above to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {pageInstances.map((inst, index) => (
              <div
                key={inst.id}
                className="flex items-center justify-between bg-[var(--color-background)] border border-[var(--color-border)] rounded p-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-[var(--color-muted)] w-6 text-right select-none">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-foreground)]">
                        {inst.componentTypeName}
                      </span>
                      {inst.isRepeatable && (
                        <span className="text-[10px] bg-[var(--color-surface-hover)] text-[var(--color-accent)] border border-[var(--color-border)] px-1.5 py-0.2 rounded">
                          repeatable
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      slug: <span className="text-[var(--color-foreground)]">{inst.componentTypeSlug}</span> | values stored: {inst.valuesCount}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Up / Down Controls */}
                  <div className="flex items-center border border-[var(--color-border)] rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleMove(index, "up")}
                      disabled={isPending || index === 0}
                      title="Move instance up"
                      aria-label="Move instance up"
                      className="px-2 py-1 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent border-r border-[var(--color-border)] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                    >
                      ▲ Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, "down")}
                      disabled={isPending || index === pageInstances.length - 1}
                      title="Move instance down"
                      aria-label="Move instance down"
                      className="px-2 py-1 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                    >
                      ▼ Down
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => setInstanceToRemove(inst)}
                    disabled={isPending}
                    className="text-xs text-[var(--color-danger)] hover:opacity-80 px-2 py-1 border border-[var(--color-danger)]/30 hover:border-[var(--color-danger)] rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Removal */}
      {instanceToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              Confirm Instance Removal
            </h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Are you sure you want to remove this instance of{" "}
              <strong className="text-[var(--color-foreground)]">
                {instanceToRemove.componentTypeName}
              </strong>{" "}
              from page &quot;/{instanceToRemove.page}&quot;?
            </p>
            <div className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-danger)]/30 rounded text-xs text-[var(--color-danger)] font-mono">
              ⚠️ Warning: This will permanently delete this instance and all of its filled values.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInstanceToRemove(null)}
                disabled={isPending}
                className="px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isPending}
                className="px-3 py-1.5 text-xs bg-[var(--color-danger)] text-white font-semibold rounded hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Removing..." : "Confirm remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
