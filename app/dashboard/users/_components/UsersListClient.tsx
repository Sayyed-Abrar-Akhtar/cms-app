"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TerminalWindow } from "@/app/_components/TerminalWindow";
import { resetEditorQuotaAction } from "@/app/dashboard/organizations/actions";

export interface SerializedUserOrg {
  id: string;
  name: string;
  slug: string;
}

export interface SerializedUser {
  id: string;
  name?: string | null;
  email: string;
  role: "SUPERADMIN" | "EDITOR";
  organizations: SerializedUserOrg[];
  updateQuota: number;
  updatesUsedInPeriod: number;
  createdAt: string;
}

export function UsersListClient({ users }: { users: SerializedUser[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = u.name ? u.name.toLowerCase().includes(q) : false;
    const emailMatch = u.email.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const handleResetQuota = async (userId: string) => {
    setError(null);
    setSuccessMsg(null);
    setResettingId(userId);

    try {
      const res = await resetEditorQuotaAction(userId);
      if (!res.success) {
        setError(res.error || "Failed to reset quota.");
      } else {
        setSuccessMsg("Editor quota reset successfully.");
      }
    } catch {
      setError("An unexpected error occurred while resetting quota.");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <TerminalWindow
      title="~/cms/users"
      onClose={() => router.push("/dashboard")}
      defaultMaxWidth="max-w-5xl"
    >
      <div className="p-6 space-y-6 font-mono text-xs">
        {/* Header navigation & breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                ← dashboard
              </button>
              <span className="text-xs text-[var(--color-muted)]">/</span>
              <span className="text-xs text-[var(--color-accent)]">users</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)] mt-1">
              User Directory
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Global overview of all superadmins and editors across the system.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full sm:w-64 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-danger)]/50 rounded text-xs text-[var(--color-danger)]">
            [error] {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-accent)]/50 rounded text-xs text-[var(--color-accent)]">
            [success] {successMsg}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
          <span>
            Showing {filteredUsers.length} of {users.length} user{users.length === 1 ? "" : "s"}
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center bg-[var(--color-surface-hover)] border border-dashed border-[var(--color-border)] rounded-lg space-y-2">
            <div className="text-sm font-semibold text-[var(--color-foreground)]">
              No users found
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              {searchQuery
                ? `No user matches search '${searchQuery}'.`
                : "No users registered in the system yet."}
            </p>
          </div>
        ) : (
          <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface-hover)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    <th className="py-2.5 px-4 font-bold">User</th>
                    <th className="py-2.5 px-4 font-bold">Role</th>
                    <th className="py-2.5 px-4 font-bold">Organizations</th>
                    <th className="py-2.5 px-4 font-bold">Quota Usage</th>
                    <th className="py-2.5 px-4 font-bold">Created</th>
                    <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredUsers.map((u) => {
                    const isEditor = u.role === "EDITOR";
                    const isUnattached = isEditor && u.organizations.length === 0;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-[var(--color-surface)]/60 transition-colors"
                      >
                        {/* User info */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-bold text-[var(--color-foreground)]">
                            {u.name ? u.name : u.email}
                          </div>
                          {u.name && (
                            <div className="text-[10px] text-[var(--color-muted)]">
                              {u.email}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4 align-top">
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border inline-block ${
                              u.role === "SUPERADMIN"
                                ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                                : "bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)]"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        {/* Organizations */}
                        <td className="py-3 px-4 align-top">
                          {isUnattached ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/40">
                                [Unattached]
                              </span>
                              <div className="text-[10px] text-[var(--color-muted)] italic">
                                No org assigned
                              </div>
                            </div>
                          ) : u.organizations.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {u.organizations.map((org) => (
                                <Link
                                  key={org.id}
                                  href={`/dashboard/organizations/${org.slug}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-foreground)] hover:text-[var(--color-accent)] transition-colors text-[11px]"
                                >
                                  <span>▤</span>
                                  <span>{org.name}</span>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted)]">—</span>
                          )}
                        </td>

                        {/* Quota Usage */}
                        <td className="py-3 px-4 align-top">
                          {isEditor ? (
                            <div className="text-[11px] text-[var(--color-foreground)]">
                              {u.updatesUsedInPeriod} / {u.updateQuota} used
                            </div>
                          ) : (
                            <span className="text-[var(--color-muted)]">—</span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="py-3 px-4 align-top text-[11px] text-[var(--color-muted)] whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 align-top text-right">
                          {isEditor ? (
                            <button
                              type="button"
                              onClick={() => handleResetQuota(u.id)}
                              disabled={resettingId === u.id}
                              className="py-1 px-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded font-semibold text-[10px] transition-colors disabled:opacity-50"
                            >
                              {resettingId === u.id ? "Resetting…" : "Reset quota"}
                            </button>
                          ) : (
                            <span className="text-[var(--color-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </TerminalWindow>
  );
}
