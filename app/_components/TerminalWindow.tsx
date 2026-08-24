"use client";

import React, { useState } from "react";

export interface TerminalWindowProps {
  title?: string;
  redirectUrl?: string;
  defaultMaxWidth?: string; // e.g. "max-w-2xl", "max-w-4xl", "max-w-5xl"
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function TerminalWindow({
  title = "~/cms",
  defaultMaxWidth = "max-w-2xl",
  className = "",
  onClose,
  children,
}: TerminalWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const effectiveMaxWidth = isMaximized ? "max-w-none" : defaultMaxWidth;

  const handleRedClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
      return;
    }
    if (onClose) {
      onClose();
    }
  };

  const handleYellowClick = () => {
    setIsMinimized((prev) => !prev);
  };

  const handleGreenClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
      return;
    }
    setIsMaximized((prev) => !prev);
  };

  return (
    <div
      className={`w-full ${effectiveMaxWidth} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 motion-reduce:transition-none ${className}`}
    >
      {/* Terminal Header */}
      <div className="bg-[#17171b] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Red Dot (Close) */}
          <button
            type="button"
            onClick={handleRedClick}
            disabled={!onClose && !isMinimized}
            aria-label={
              isMinimized
                ? "Restore window"
                : onClose
                ? "Close window"
                : "Close window (disabled)"
            }
            className={`p-1.5 -m-1 rounded-full flex items-center justify-center transition-all motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              !onClose && !isMinimized
                ? "opacity-30 cursor-not-allowed"
                : "opacity-80 hover:opacity-100 cursor-pointer"
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[var(--color-danger)] block hover:scale-110 motion-reduce:hover:scale-100 transition-transform" />
          </button>

          {/* Yellow Dot (Minimize) */}
          <button
            type="button"
            onClick={handleYellowClick}
            aria-label={isMinimized ? "Restore window" : "Minimize window"}
            className="p-1.5 -m-1 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-all motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            <span className="w-3 h-3 rounded-full bg-[var(--color-warning)] block hover:scale-110 motion-reduce:hover:scale-100 transition-transform" />
          </button>

          {/* Green Dot (Maximize) */}
          <button
            type="button"
            onClick={handleGreenClick}
            aria-label={
              isMinimized
                ? "Restore window"
                : isMaximized
                ? "Restore window size"
                : "Maximize window"
            }
            className="p-1.5 -m-1 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-all motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] block hover:scale-110 motion-reduce:hover:scale-100 transition-transform" />
          </button>
        </div>
        <div className="text-xs text-[var(--color-muted)] font-mono tracking-tight">
          {title}
        </div>
        <div className="w-11 hidden sm:block" />
      </div>

      {/* Terminal Body */}
      {!isMinimized && children}
    </div>
  );
}
