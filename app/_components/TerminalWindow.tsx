import React from "react";

export interface TerminalWindowProps {
  title?: string;
  redirectUrl?: string;
  defaultMaxWidth?: string; // e.g. "max-w-2xl", "max-w-4xl", "max-w-5xl"
  className?: string;
  children: React.ReactNode;
}

export function TerminalWindow({
  title = "~/cms",
  defaultMaxWidth = "max-w-2xl",
  className = "",
  children,
}: TerminalWindowProps) {
  return (
    <div
      className={`w-full ${defaultMaxWidth} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Terminal Header */}
      <div className="bg-[#17171b] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all"
          />
          <span
            className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all"
          />
          <span
            className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all"
          />
        </div>
        <div className="text-xs text-[var(--color-muted)] font-mono tracking-tight">
          {title}
        </div>
        <div className="w-11 hidden sm:block" />
      </div>

      {/* Terminal Body */}
      {children}
    </div>
  );
}
