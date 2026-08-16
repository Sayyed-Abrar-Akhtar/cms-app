"use client";

import { useState } from "react";
import { regenerateApiKeyAction } from "@/app/dashboard/organizations/actions";

interface ApiKeyCardProps {
  organizationId: string;
  initialApiKey: string;
  slug: string;
}

export function ApiKeyCard({ organizationId, initialApiKey, slug }: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsRegenerating(true);

    try {
      // TODO: Verify that regenerating publicApiKey immediately invalidates the old key once Task 7's public API is implemented.
      const res = await regenerateApiKeyAction(organizationId);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to regenerate API key.");
      } else {
        setApiKey(res.data.publicApiKey);
        setShowConfirm(false);
        setSuccessMsg("API key regenerated. The previous API key has been invalidated.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError("An unexpected error occurred while regenerating the API key.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="p-5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg space-y-4 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">
            Public API Key
          </h2>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            Read-only key for client frontend queries (<span className="text-[var(--color-foreground)]">/api/public/{slug}/[page]</span>).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirm(!showConfirm)}
          disabled={isRegenerating}
          className="self-start sm:self-auto py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 border border-[var(--color-danger)]/40 text-[var(--color-danger)] rounded font-semibold text-xs transition-colors disabled:opacity-50"
        >
          Regenerate API key
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-danger)]/50 rounded text-[11px] text-[var(--color-danger)]">
          [error] {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[var(--color-accent-dim)]/40 border border-[var(--color-accent)]/50 rounded text-[11px] text-[var(--color-accent)]">
          [updated] {successMsg}
        </div>
      )}

      {showConfirm && (
        <div className="p-4 bg-red-950/30 border border-[var(--color-danger)]/50 rounded space-y-3">
          <div className="space-y-1">
            <div className="font-bold text-[var(--color-danger)] text-xs">
              ⚠️ Regenerate API key confirmation
            </div>
            <p className="text-[11px] text-[var(--color-foreground)] leading-relaxed font-sans">
              Regenerating will immediately invalidate the existing API key. Any live frontend sites using the current key will lose read access until updated with the new key.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="py-1.5 px-3 bg-[var(--color-danger)] text-black font-bold rounded text-xs hover:bg-[var(--color-danger)]/90 transition-colors disabled:opacity-50"
            >
              {isRegenerating ? "Regenerating..." : "Confirm regenerate"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="py-1.5 px-3 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={apiKey}
          className="flex-1 p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-xs text-[var(--color-accent)] font-mono selection:bg-[var(--color-accent-dim)]"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="py-2.5 px-4 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded transition-colors text-xs shrink-0"
        >
          {copied ? "Copied!" : "Copy key"}
        </button>
      </div>
    </div>
  );
}
