"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_STORAGE_KEY, SHARED_PASSWORD, findStaffByEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const staff = findStaffByEmail(email);
    if (!staff || password !== SHARED_PASSWORD) {
      setError("Email atau password salah.");
      return;
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Decore" className="h-16 sm:h-20 w-auto mb-6" />
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full max-w-sm border border-terracotta/15">
        <h1 className="text-lg font-bold text-terracotta text-center mb-6">Staff Login</h1>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-terracotta/25 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-terracotta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-terracotta/25 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-terracotta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          type="submit"
          className="w-full bg-terracotta text-white py-2.5 rounded-md font-semibold mt-5 hover:opacity-90"
        >
          Log In
        </button>
      </form>
    </div>
  );
}
