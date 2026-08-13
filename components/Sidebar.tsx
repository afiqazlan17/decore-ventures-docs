"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthGate";

const NAV = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Create New Job", href: "/jobs/new", icon: "➕" },
  { label: "Job Monitoring", href: "/jobs", icon: "📋" },
  { label: "Customers", href: "/customers", icon: "👤" },
  { label: "Vendors", href: "/vendors", icon: "🏭" },
  { label: "Document History", href: "/history", icon: "📄" },
  { label: "Catalog", href: "/catalog", icon: "🎨" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (pathname === "/login") return null;

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden bg-terracotta text-white px-4 py-3 flex items-center justify-between shadow sticky top-0 z-30">
        <a href="/" className="text-lg font-bold tracking-tight">
          Decore <span className="font-normal opacity-90">Docs</span>
        </a>
        <button onClick={() => setOpen(true)} className="text-2xl leading-none px-2">
          ☰
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-terracotta/15 z-50 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-terracotta/10 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Decore" className="h-9 w-auto" />
          <button onClick={() => setOpen(false)} className="lg:hidden text-xl text-ink/50">
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-terracotta text-white"
                    : "text-ink hover:bg-terracotta/10"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-terracotta/10">
          {user && <div className="text-xs opacity-60 mb-2">Logged in as {user.name}</div>}
          {user && (
            <button
              onClick={logout}
              className="w-full bg-terracotta/10 hover:bg-terracotta/20 text-terracotta text-xs font-semibold py-2 rounded"
            >
              Logout
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
