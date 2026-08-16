"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono flex flex-col items-center justify-center p-6">
      <TerminalWindow title="~/cms/error.sh" defaultMaxWidth="max-w-md">
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-[var(--color-danger)]">$ status --error</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              System Error
            </h1>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Something broke on our end.
            </p>
            {error.digest && (
              <div className="p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-muted)]">
                digest: {error.digest}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 py-2.5 px-4 bg-[var(--color-accent)] hover:opacity-90 text-black font-semibold text-xs rounded text-center transition-opacity cursor-pointer"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold text-xs rounded text-center transition-colors"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}
