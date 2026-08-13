"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthGate";

const NAV = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Create New Job", href: "/jobs/new", icon: "➕" },
  { label: "Job Monitoring", href: "/jobs", icon: "📋" },
  { label: "Customers", href: "/customers", icon: "👤" },
  { label: "Document History", href: "/history", icon: "📄" },
  { label: "Catalog", href: "/catalog", icon: "🎨" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (pathname === "/login") return null;

  // Labels/details are visible whenever the mobile drawer is open, or on
  // desktop when the sidebar isn't collapsed — collapse only applies at lg.
  const expanded = open || !collapsed;

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-[60] w-10 h-10 rounded-lg bg-[#1F1712] text-white text-xl flex items-center justify-center shadow-lg"
        >
          ☰
        </button>
      )}

      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1F1712] text-white z-50 flex flex-col overflow-hidden transition-all duration-200 ${
          collapsed ? "lg:w-16" : "lg:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className={`flex items-center border-b border-white/10 ${expanded ? "justify-between px-5 py-5" : "justify-center px-2 py-5"}`}>
          {expanded ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Decore" className="h-8 w-auto" />
              <span className="mt-2 inline-block text-[11px] font-medium text-terracotta bg-terracotta/15 rounded-full px-2.5 py-1">
                Job Dashboard
              </span>
            </div>
          ) : (
            <span className="text-lg font-extrabold">D</span>
          )}
          {open && (
            <button onClick={() => setOpen(false)} className="lg:hidden text-xl text-white/50">
              ✕
            </button>
          )}
        </div>

        <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className={`relative w-full flex items-center gap-3 h-11 text-sm font-medium transition ${
                  expanded ? "px-5" : "justify-center px-0"
                } ${active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-terracotta" />}
                <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                {expanded && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:block border-t border-white/10 px-5 py-2.5 text-[11px] text-white/30 hover:text-white/60 text-left"
        >
          {collapsed ? "→" : "← Collapse"}
        </button>

        {user && (
          <div className={`border-t border-white/10 py-4 ${expanded ? "px-5" : "px-2 flex flex-col items-center"}`}>
            <div className={`flex items-center gap-2.5 ${expanded ? "" : "flex-col"}`}>
              <div className="w-8 h-8 rounded-full bg-terracotta/20 text-terracotta font-bold text-sm flex items-center justify-center shrink-0">
                {user.name.charAt(0)}
              </div>
              {expanded && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{user.name}</div>
                  <div className="text-[10px] text-white/40 truncate">{user.email}</div>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className={`mt-2.5 text-[11px] font-medium text-white/40 hover:text-white/70 border border-white/10 rounded py-1.5 ${
                expanded ? "w-full" : "w-8"
              }`}
            >
              {expanded ? "Logout" : "⏻"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
