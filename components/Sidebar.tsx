"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "./AuthGate";

const NAV = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Job", href: "/jobs", icon: "📋" },
  { label: "Customers", href: "/customers", icon: "👤" },
  { label: "Vendors", href: "/vendors", icon: "🏭" },
  { label: "Finance", href: "/finance", icon: "💰" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Catalog", href: "/catalog", icon: "🎨" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

const JOB_SUBMENU = [
  { label: "New Job", href: "/jobs/new", icon: "➕" },
  { label: "Job Queue", view: "queue", icon: "📋" },
  { label: "Aging Job", view: "aging", icon: "⏳" },
  { label: "My Jobs", view: "mine", icon: "🙋" },
];

// The active sub-view comes from ?view= — isolated in its own component so
// only this small part of the sidebar needs a Suspense boundary for
// useSearchParams, instead of forcing every page (which all render through
// Sidebar) to opt into dynamic rendering.
function JobSubmenu({ onNav }: { onNav: (href: string) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") || "queue";

  return (
    <div className="ml-4 mt-1 mb-1 space-y-0.5 border-l border-terracotta/15 pl-3">
      {JOB_SUBMENU.map((item) => {
        const active = item.href ? pathname === item.href : pathname === "/jobs" && activeView === item.view;
        return (
          <button
            key={item.label}
            onClick={() => onNav(item.href || `/jobs?view=${item.view}`)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition ${
              active ? "bg-terracotta/10 text-terracotta font-semibold" : "text-ink/60 hover:bg-terracotta/5"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

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
            const isJob = item.href === "/jobs";
            const active = isJob ? pathname.startsWith("/jobs") : pathname === item.href;
            return (
              <div key={item.href}>
                <button
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
                {isJob && active && (
                  <Suspense fallback={null}>
                    <JobSubmenu onNav={go} />
                  </Suspense>
                )}
              </div>
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
