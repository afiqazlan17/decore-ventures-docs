"use client";

import { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-terracotta to-[#8f3f2c] text-white rounded-xl px-6 py-6 sm:px-8 sm:py-7 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-white/80 mt-1 text-sm">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
