"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_STORAGE_KEY, StaffUser } from "@/lib/auth";

interface AuthContextValue {
  user: StaffUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as StaffUser) : null;
    setUser(parsed);
    setChecked(true);
    if (!parsed && pathname !== "/login") {
      router.replace("/login");
    }
    if (parsed && pathname === "/login") {
      router.replace("/");
    }
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    router.replace("/login");
  }

  if (!checked) return null;
  if (!user && pathname !== "/login") return null;

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
