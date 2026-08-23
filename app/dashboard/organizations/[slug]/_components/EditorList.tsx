"use client";

import { useState } from "react";
import { removeEditorAction, resetEditorQuotaAction } from "@/app/dashboard/organizations/actions";

interface EditorItem {
  id: string;
  name?: string | null;
  email: string;
  updatesUsedInPeriod?: number;
  updateQuota?: number;
  createdAt: string;
}

interface EditorListProps {
  organizationId: string;
  editors: EditorItem[];
}

export function EditorList({ organizationId, editors }: EditorListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    setError(null);
    setRemovingId(userId);

    try {
      const res = await removeEditorAction(organizationId, userId);
      if (!res.success) {
        setError(res.error || "Failed to remove editor.");
      } else {
        setConfirmId(null);
      }
    } catch {
      setError("An unexpected error occurred while removing editor.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleResetQuota = async (userId: string) => {
    setError(null);
    setResettingId(userId);

    try {
      const res = await resetEditorQuotaAction(userId, organizationId);
      if (!res.success) {
        setError(res.error || "Failed to reset quota.");
      }
    } catch {
      setError("An unexpected error occurred while resetting quota.");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="p-5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">
            Attached Editors
          </h2>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            Users who can view and edit component values for this organization.
          </p>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)]">
          {editors.length} editor{editors.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-danger)]/50 rounded text-xs text-[var(--color-danger)]">
          [error] {error}
        </div>
      )}

      {editors.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-[var(--color-border)] rounded text-[11px] text-[var(--color-muted)]">
          No editors attached yet — invite an editor by email below.
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {editors.map((editor) => {
            const isConfirming = confirmId === editor.id;
            const isRemoving = removingId === editor.id;

            return (
              <div
                key={editor.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-[var(--color-foreground)]">
                    {editor.name ? editor.name : editor.email}
                  </div>
                  {editor.name && (
                    <div className="text-[10px] text-[var(--color-muted)]">
                      {editor.email}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--color-muted)]">
                    Attached: {new Date(editor.createdAt).toLocaleDateString()}
                  </div>
                  {typeof editor.updatesUsedInPeriod === "number" && (
                    <div className="text-[10px] text-[var(--color-foreground)] font-mono mt-0.5">
                      Quota used: {editor.updatesUsedInPeriod} / {editor.updateQuota ?? 30}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResetQuota(editor.id)}
                    disabled={resettingId === editor.id}
                    className="py-1 px-3 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded font-semibold text-[11px] transition-colors disabled:opacity-50"
                  >
                    {resettingId === editor.id ? "Resetting…" : "Reset quota"}
                  </button>
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--color-danger)] font-semibold">
                        Remove editor?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(editor.id)}
                        disabled={isRemoving}
                        className="py-1 px-2.5 bg-[var(--color-danger)] text-black font-bold rounded text-[11px] hover:bg-[var(--color-danger)]/90 transition-colors disabled:opacity-50"
                      >
                        {isRemoving ? "Removing..." : "Yes, remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="py-1 px-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded text-[11px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(editor.id)}
                      className="py-1 px-3 bg-red-950/30 hover:bg-red-900/40 border border-[var(--color-danger)]/40 text-[var(--color-danger)] rounded font-semibold text-[11px] transition-colors"
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
  );
}
