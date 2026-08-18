"use client";

import { useState } from "react";
import { Magic } from "magic-sdk";
import { TerminalWindow } from "@/app/_components/TerminalWindow";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        throw new Error(checkData.error || "Failed to verify email registration.");
      }

      if (!checkData.exists) {
        setStatus("error");
        setErrorMessage("This email isn't registered for CMS access — contact your administrator.");
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
      if (!apiKey) {
        throw new Error("Magic Publishable Key is not configured (NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY).");
      }

      const magic = new Magic(apiKey);
      const didToken = await magic.auth.loginWithMagicLink({ email });

      if (!didToken) {
        throw new Error("Failed to retrieve authentication token from Magic.");
      }

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${didToken}`,
        },
        body: JSON.stringify({ didToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication verification failed.");
      }

      setStatus("success");
      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err: unknown) {
      console.error(err);
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during login. Please try again."
      );
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex items-center justify-center p-4 font-mono">
      <TerminalWindow title="~/cms/auth/login.sh" redirectUrl="/" defaultMaxWidth="max-w-md">
        {/* Terminal Body Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <div className="text-xs text-[var(--color-accent)]">system: auth_init</div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-foreground)] font-mono">
              CMS Terminal Access
            </h1>
            <p className="text-xs text-[var(--color-muted)]">
              Enter your email address to receive a magic authentication link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-mono text-[var(--color-muted)]">
                <span className="text-[var(--color-accent)]">$</span> login --email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                disabled={status === "loading"}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)] font-mono transition-colors disabled:opacity-50"
              />
            </div>

            {status === "error" && (
              <div className="p-3 bg-red-950/30 border border-[var(--color-danger)]/40 rounded text-xs text-[var(--color-danger)] font-mono">
                [error] {errorMessage}
              </div>
            )}

            {status === "success" && (
              <div className="p-3 bg-emerald-950/30 border border-[var(--color-accent)]/40 rounded text-xs text-[var(--color-accent)] font-mono">
                [success] Verified. Redirecting to dashboard...
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className="w-full py-2.5 px-4 bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-50 text-black font-semibold text-xs rounded transition-opacity cursor-pointer font-mono flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <span className="inline-block animate-pulse">▋</span> Processing...
                </>
              ) : (
                "Send magic link"
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted)] font-mono flex justify-between">
            <span>SECURE_AUTH: ACTIVE</span>
            <span>CMS_v0.1.0</span>
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}
