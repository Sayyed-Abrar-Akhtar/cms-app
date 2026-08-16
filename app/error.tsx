"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-xl">
        {/* Terminal Window Header */}
        <div className="bg-[#17171b] px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80" />
          </div>
          <div className="text-xs text-[var(--color-muted)] font-mono">
            ~/cms/errors/500.sh
          </div>
          <div className="w-12" />
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-bold text-[var(--color-danger)] uppercase tracking-wider">
              [error] Application Exception
            </div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">
              An unexpected system error occurred.
            </h1>
            <p className="text-xs text-[var(--color-muted)] font-sans">
              An unhandled runtime error was caught during processing.
            </p>
          </div>

          <div className="p-3 bg-red-950/20 border border-[var(--color-danger)]/30 rounded text-xs text-[var(--color-danger)] font-mono break-all space-y-1">
            <div>$ error_msg: {error.message || "Unknown error"}</div>
            {error.digest && <div>$ digest: {error.digest}</div>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
            <Link
              href="/dashboard"
              className="py-2 px-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors"
            >
              Return to dashboard
            </Link>
            <button
              onClick={() => reset()}
              className="py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
