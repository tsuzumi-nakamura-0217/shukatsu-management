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
      <main className="flex-1 bg-background">
        <MobileSidebar />
        <div className="mx-auto w-full px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
