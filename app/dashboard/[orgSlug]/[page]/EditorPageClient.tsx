"use client";

import { useState, useTransition } from "react";
import type { InstanceData } from "@/app/dashboard/_fields/InstanceForm";
import { InstanceForm } from "@/app/dashboard/_fields/InstanceForm";
import {
  addRepeatableInstanceAction,
  removeRepeatableInstanceAction,
  reorderRepeatableInstancesAction,
} from "@/app/dashboard/actions";

export interface RepeatableTypeOption {
  id: string;
  name: string;
  slug: string;
}

interface EditorPageClientProps {
  orgSlug: string;
  page: string;
  instances: InstanceData[];
  repeatableTypes: RepeatableTypeOption[];
}

export function EditorPageClient({
  orgSlug,
  page,
  instances,
  repeatableTypes,
}: EditorPageClientProps) {
  const [instanceToRemove, setInstanceToRemove] = useState<InstanceData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= instances.length) return;

    const newOrderList = [...instances];
    const [movedItem] = newOrderList.splice(index, 1);
    newOrderList.splice(targetIndex, 0, movedItem);

    const instanceIdsInOrder = newOrderList.map((item) => item.id);

    setError(null);
    startTransition(async () => {
      const res = await reorderRepeatableInstancesAction(
        orgSlug,
        page,
        instanceIdsInOrder
      );
      if (!res.success) {
        setError(res.error || "Failed to reorder component instances.");
      }
    });
  };

  const handleAddRepeatable = (componentTypeId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await addRepeatableInstanceAction(
        orgSlug,
        page,
        componentTypeId
      );
      if (!res.success) {
        setError(res.error || "Failed to add repeatable component.");
      }
    });
  };

  const handleConfirmRemove = () => {
    if (!instanceToRemove) return;

    setError(null);
    startTransition(async () => {
      const res = await removeRepeatableInstanceAction(instanceToRemove.id);
      if (!res.success) {
        setError(res.error || "Failed to remove component instance.");
      } else {
        setInstanceToRemove(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-xs bg-red-950/40 text-[var(--color-danger)] border border-[var(--color-danger)]/30 rounded font-mono">
          [error] {error}
        </div>
      )}

      {instances.map((instance, index) => (
        <div key={instance.id} className="space-y-2">
          {instance.isRepeatable && (
            <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-3 py-1.5 font-mono text-xs text-[var(--color-muted)]">
              <span>
                Repeatable item controls for{" "}
                <span className="text-[var(--color-foreground)] font-semibold">
                  {instance.typeName}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-[var(--color-border)] rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={isPending || index === 0}
                    title="Move up"
                    className="px-2 py-0.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 border-r border-[var(--color-border)] transition-colors"
                  >
                    ▲ Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={isPending || index === instances.length - 1}
                    title="Move down"
                    className="px-2 py-0.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 transition-colors"
                  >
                    ▼ Down
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setInstanceToRemove(instance)}
                  disabled={isPending}
                  className="text-xs text-[var(--color-danger)] hover:text-red-300 px-2 py-0.5 border border-[var(--color-danger)]/30 hover:border-[var(--color-danger)] rounded transition-colors"
                >
                  Remove item
                </button>
              </div>
            </div>
          )}

          <InstanceForm instance={instance} />
        </div>
      ))}

      {/* Add repeatable component options */}
      {repeatableTypes.length > 0 && (
        <div className="border border-dashed border-[var(--color-border)] rounded bg-[var(--color-surface)]/50 p-4 space-y-3 font-mono">
          <div className="text-xs text-[var(--color-muted)] font-semibold">
            + Add repeatable entry to &quot;/{page}&quot;
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {repeatableTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleAddRepeatable(type.id)}
                disabled={isPending}
                className="bg-[var(--color-accent-dim)] text-[var(--color-accent)] border border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)] hover:text-[var(--color-background)] px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
              >
                + Add {type.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation modal for removing repeatable component */}
      {instanceToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              Confirm Instance Removal
            </h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed font-sans">
              Are you sure you want to remove this instance of{" "}
              <strong className="text-[var(--color-foreground)]">
                {instanceToRemove.typeName}
              </strong>{" "}
              from page &quot;/{page}&quot;?
            </p>
            <div className="p-3 bg-red-950/30 border border-[var(--color-danger)]/30 rounded text-xs text-[var(--color-danger)]">
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
