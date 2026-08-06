import "./globals.css";
import type { ReactNode } from "react";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Decore Ventures — Docs",
  description: "Internal system for jobs, customers, and documents",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </body>
    </html>
  );
}
