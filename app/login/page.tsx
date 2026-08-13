"use client";

import { useRouter } from "next/navigation";
import { AUTH_STORAGE_KEY, STAFF, StaffUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  function selectStaff(staff: StaffUser) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Decore" className="h-16 sm:h-20 w-auto mb-6" />
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-bold text-terracotta text-center mb-6">Siapa awak?</h1>
        <div className="space-y-3">
          {STAFF.map((staff) => (
            <button
              key={staff.email}
              onClick={() => selectStaff(staff)}
              className="w-full bg-white border border-terracotta/15 rounded-xl px-5 py-4 flex items-center gap-3 shadow-sm hover:border-terracotta hover:bg-terracotta/5 transition"
            >
              <div className="w-10 h-10 rounded-full bg-terracotta/15 text-terracotta font-bold flex items-center justify-center shrink-0">
                {staff.name.charAt(0)}
              </div>
              <span className="font-semibold text-ink">{staff.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
