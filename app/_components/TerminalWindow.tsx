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
      className={`w-full ${effectiveMaxWidth} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${className}`}
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
            className={`w-3 h-3 rounded-full bg-[var(--color-danger)] inline-block transition-all focus:outline-none focus:ring-1 focus:ring-white/40 ${
              !onClose && !isMinimized
                ? "opacity-30 cursor-not-allowed"
                : "opacity-80 hover:opacity-100 hover:scale-110 cursor-pointer"
            }`}
          />

          {/* Yellow Dot (Minimize) */}
          <button
            type="button"
            onClick={handleYellowClick}
            aria-label={isMinimized ? "Restore window" : "Minimize window"}
            className="w-3 h-3 rounded-full bg-[var(--color-warning)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
          />

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
            className="w-3 h-3 rounded-full bg-[var(--color-accent)] inline-block opacity-80 hover:opacity-100 hover:scale-110 transition-all focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer"
          />
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
