"use client";

import { useState } from "react";
import { inviteEditorAction } from "@/app/dashboard/organizations/actions";

interface InviteEditorFormProps {
  organizationId: string;
}

export function InviteEditorForm({ organizationId }: InviteEditorFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await inviteEditorAction(organizationId, email);
      if (!res.success) {
        setError(res.error || "Failed to invite editor.");
      } else {
        setSuccessMsg(`Editor '${email.trim().toLowerCase()}' invited successfully.`);
        setEmail("");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError("An unexpected error occurred while inviting editor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg space-y-4 font-mono text-xs">
      <div>
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">
          Invite Editor
        </h2>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5 font-sans">
          Provide an email address to assign or create an editor account for this organization.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-danger)]/50 rounded text-xs text-[var(--color-danger)]">
          [conflict/error] {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[var(--color-accent-dim)]/40 border border-[var(--color-accent)]/50 rounded text-xs text-[var(--color-accent)]">
          [invited] {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <label htmlFor="editor-email" className="sr-only">
            Editor Email
          </label>
          <input
            id="editor-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="editor@client.com"
            className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="py-2.5 px-5 bg-[var(--color-accent)] text-black font-bold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50 shrink-0"
        >
          {isSubmitting ? "Inviting..." : "Invite editor"}
        </button>
      </form>
    </div>
  );
}
