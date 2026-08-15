import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] font-mono flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-[#17171b] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80" />
            <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80" />
          </div>
          <div className="text-xs text-[var(--color-muted)] font-mono tracking-tight">
            ~/cms/system/info.sh
          </div>
          <div className="w-12" />
        </div>

        {/* Terminal Body */}
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-[var(--color-accent)]">$ cat system.config.json</div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Headless CMS Admin Layer
            </h1>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              API-driven content management system for sayyedabrarakhtar.com.np client sites.
              Manages Component Types, Client Organizations, and Component Instance values.
            </p>
          </div>

          <div className="bg-[var(--color-background)] border border-[var(--color-border)] p-4 rounded text-xs space-y-2">
            <div className="text-[var(--color-accent)] font-semibold">01. STATUS_CHECK</div>
            <div className="text-[var(--color-muted)]">
              AUTH_MODE: Magic Link (Passwordless)<br />
              DATABASE: MongoDB Atlas via Mongoose<br />
              IMAGE_CDN: Cloudinary Signed Uploads<br />
              ROLES: SUPERADMIN | EDITOR
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/login"
              className="flex-1 py-2.5 px-4 bg-[var(--color-accent)] hover:opacity-90 text-black font-semibold text-xs rounded text-center transition-opacity"
            >
              Log in to CMS
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 px-4 bg-[var(--color-surface-hover)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold text-xs rounded text-center transition-colors"
            >
              Open Dashboard
            </Link>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted)] flex justify-between">
            <span>CMS_LAYER: ACTIVE</span>
            <span>API_STATUS: READ_ONLY_ENABLED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
