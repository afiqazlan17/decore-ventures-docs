"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-6 lg:pt-8 sm:pb-8">{children}</main>
    </div>
  );
}
