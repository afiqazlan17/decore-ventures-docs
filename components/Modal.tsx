"use client";

import { ReactNode } from "react";

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl w-full ${width} max-h-[90vh] flex flex-col shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-terracotta/10 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-terracotta">{title}</h2>
            {subtitle && <p className="text-xs opacity-50 mt-0.5 font-mono">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-ink/40 hover:text-ink/70">
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
