import Link from "next/link";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono flex flex-col items-center justify-center p-6">
      <TerminalWindow title="~/cms/404.sh" defaultMaxWidth="max-w-md">
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-[var(--color-danger)]">$ status --check</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              404 — Not Found
            </h1>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              This path doesn&apos;t exist.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block w-full py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold text-xs rounded text-center transition-colors"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}
