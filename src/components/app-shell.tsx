"use client";

import { usePathname } from "next/navigation";
import { MobileSidebar, Sidebar } from "@/components/sidebar";

const PUBLIC_PATHS = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="relative flex-1 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-500/10" />
        <div className="pointer-events-none absolute right-0 top-28 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl dark:bg-indigo-500/10" />
        <MobileSidebar />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
