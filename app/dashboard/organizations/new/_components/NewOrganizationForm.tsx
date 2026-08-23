"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createOrganizationAction,
  type CreatedOrganizationData,
} from "@/app/dashboard/organizations/actions";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewOrganizationForm({
  onDirtyChange,
  onCancel,
}: {
  onDirtyChange?: (isDirty: boolean) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [type, setType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");
  const [ownerEmail, setOwnerEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrg, setCreatedOrg] = useState<CreatedOrganizationData | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (autoSlug) {
      setSlug(slugify(val));
    }
    onDirtyChange?.(Boolean(val.trim() || ownerEmail.trim()));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    onDirtyChange?.(true);
  };

  const handleOwnerEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOwnerEmail(val);
    onDirtyChange?.(Boolean(name.trim() || val.trim()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await createOrganizationAction({
        name,
        slug,
        type,
        ownerEmail,
      });

      if (!res.success) {
        setError(res.error || "Failed to create organization.");
      } else if (res.data) {
        setCreatedOrg(res.data);
        onDirtyChange?.(false);
      }
    } catch {
      setError("An unexpected error occurred while creating the organization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (createdOrg?.publicApiKey) {
      navigator.clipboard.writeText(createdOrg.publicApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdOrg) {
    return (
      <div className="space-y-6 font-mono text-xs">
        <div className="p-4 bg-[var(--color-accent-dim)]/40 border border-[var(--color-accent)]/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-accent)]">
            <span>[success]</span>
            <span>Organization created</span>
          </div>
          <p className="text-[var(--color-foreground)]">
            Organization <span className="font-bold">{createdOrg.name}</span> ({createdOrg.slug}) has been successfully created.
          </p>
        </div>

        {/* Public API Key Card */}
        <div className="p-5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">
              Public API Key
            </h2>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[var(--color-accent-dim)] text-[var(--color-accent)] border border-[var(--color-accent)]/30">
              Read-Only
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdOrg.publicApiKey}
                className="flex-1 p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-xs text-[var(--color-accent)] font-mono selection:bg-[var(--color-accent-dim)]"
              />
              <button
                type="button"
                onClick={handleCopyKey}
                className="py-2.5 px-4 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded transition-colors text-xs flex items-center gap-1 shrink-0"
              >
                {copied ? "Copied!" : "Copy key"}
              </button>
            </div>

            <p className="text-[var(--color-muted)] text-[11px] leading-relaxed">
              Note: This key is how the client&apos;s own site will read their content from the public API.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href={`/dashboard/organizations/${createdOrg.slug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 bg-[var(--color-accent)] text-black font-bold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
          >
            Manage organization →
          </Link>
          <Link
            href="/dashboard/organizations"
            className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-5 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded text-xs transition-colors"
          >
            ← Back to organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-mono text-xs">
      {error && (
        <div className="p-3 bg-red-950/40 border border-[var(--color-danger)]/50 rounded text-xs text-[var(--color-danger)]">
          [error] {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label htmlFor="name" className="block text-xs font-semibold text-[var(--color-foreground)]">
            Organization Name <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Acme Corporation"
            className="w-full p-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
          />
          <p className="text-[11px] text-[var(--color-muted)]">
            Client company or individual entity name.
          </p>
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <label htmlFor="slug" className="block text-xs font-semibold text-[var(--color-foreground)]">
            Organization Slug <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={handleSlugChange}
            placeholder="e.g. acme-corp"
            className="w-full p-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
          <p className="text-[11px] text-[var(--color-muted)]">
            Unique URL slug used in API endpoints, e.g. <span className="text-[var(--color-foreground)]">/api/public/{slug || "slug"}/[page]</span>.
          </p>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <label htmlFor="type" className="block text-xs font-semibold text-[var(--color-foreground)]">
            Client Type <span className="text-[var(--color-accent)]">*</span>
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as "COMPANY" | "INDIVIDUAL")}
            className="w-full p-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
          >
            <option value="COMPANY">COMPANY</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
          </select>
          <p className="text-[11px] text-[var(--color-muted)]">
            Categorizes the client project entity type.
          </p>
        </div>

        {/* Owner Email */}
        <div className="space-y-1">
          <label htmlFor="ownerEmail" className="block text-xs font-semibold text-[var(--color-foreground)]">
            Owner Email <span className="text-[var(--color-accent)]">*</span>
          </label>
          <input
            id="ownerEmail"
            type="email"
            required
            value={ownerEmail}
            onChange={handleOwnerEmailChange}
            placeholder="e.g. owner@acme.com"
            className="w-full p-2.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
          <p className="text-[11px] text-[var(--color-muted)]">
            Primary contact email for this organization.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--color-border)] flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="py-2.5 px-5 bg-[var(--color-accent)] text-black font-bold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Creating..." : "Create organization"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/dashboard/organizations"
            className="py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold rounded text-xs transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
