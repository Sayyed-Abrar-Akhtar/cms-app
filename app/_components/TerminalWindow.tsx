"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface TerminalWindowProps {
  title?: string;
  redirectUrl?: string;
  defaultMaxWidth?: string; // e.g. "max-w-2xl", "max-w-4xl", "max-w-5xl"
  className?: string;
  children: React.ReactNode;
}

export function TerminalWindow({
  title = "~/cms",
  redirectUrl = "/",
  defaultMaxWidth = "max-w-2xl",
  className = "",
  children,
}: TerminalWindowProps) {
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleRedClick = () => {
    router.push(redirectUrl);
  };

  const handleYellowClick = () => {
    setIsMinimized((prev) => !prev);
  };

  const handleGreenClick = () => {
    setIsMaximized((prev) => !prev);
  };

  const containerMaxWidth = isMaximized ? "max-w-full" : defaultMaxWidth;

  return (
    <div
      className={`w-full ${containerMaxWidth} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Terminal Header */}
      <div className="bg-[#17171b] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRedClick}
            title={`Redirect to ${redirectUrl}`}
            aria-label="Close and redirect"
            className="w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer border-0 p-0"
          />
          <button
            type="button"
            onClick={handleYellowClick}
            title={isMinimized ? "Restore window" : "Minimize / Collapse window"}
            aria-label="Minimize window"
            className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer border-0 p-0"
          />
          <button
            type="button"
            onClick={handleGreenClick}
            title={isMaximized ? "Restore size" : "Maximize / Expand window"}
            aria-label="Maximize window"
            className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer border-0 p-0"
          />
        </div>
        <div className="text-xs text-[var(--color-muted)] font-mono tracking-tight">
          {title}
        </div>
        <div className="text-[10px] text-[var(--color-muted)] font-mono opacity-60 hidden sm:block">
          {isMaximized ? "[expanded]" : isMinimized ? "[minimized]" : ""}
        </div>
      </div>

      {/* Terminal Body */}
      {isMinimized ? (
        <div className="p-4 text-center text-xs text-[var(--color-muted)] font-mono bg-[var(--color-background)] flex items-center justify-between">
          <span>Window is minimized ({title})</span>
          <button
            type="button"
            onClick={handleYellowClick}
            className="px-2 py-1 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[11px] text-[var(--color-accent)] hover:underline"
          >
            Restore Window
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
