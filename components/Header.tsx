"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthGate";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (pathname === "/login") return null;

  return (
    <header className="bg-terracotta text-white px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-y-2 shadow">
      <a href="/" className="text-lg sm:text-xl font-bold tracking-tight">
        Decore <span className="font-normal opacity-90">Docs</span>
      </a>
      <nav className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium flex-wrap">
        <a href="/" className="hover:opacity-80">Home</a>
        <a href="/history" className="hover:opacity-80">History</a>
        {user && <span className="opacity-80 hidden sm:inline">Hi, {user.name}</span>}
        {user && (
          <button onClick={logout} className="bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded text-xs">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
