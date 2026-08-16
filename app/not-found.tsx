import Link from "next/link";

export default function NotFound() {
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
            ~/cms/errors/404.sh
          </div>
          <div className="w-12" />
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-bold text-[var(--color-danger)] uppercase tracking-wider">
              [error 404] Resource Not Found
            </div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">
              Page or endpoint does not exist.
            </h1>
            <p className="text-xs text-[var(--color-muted)] font-sans">
              The requested file path or route could not be found in the CMS system architecture.
            </p>
          </div>

          <div className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-xs text-[var(--color-muted)] font-mono space-y-1">
            <div>$ status: 404_NOT_FOUND</div>
            <div>$ action: check_url_or_navigate</div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
            <Link
              href="/dashboard"
              className="py-2 px-4 bg-[var(--color-accent)] text-black font-semibold rounded text-xs hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
