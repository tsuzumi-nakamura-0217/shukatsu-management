"use client";

import { usePathname } from "next/navigation";
import { MobileSidebar, Sidebar } from "@/components/sidebar";
import { FloatingChat } from "@/components/floating-chat";
import { cn } from "@/lib/utils";

const PUBLIC_PATHS = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPath = pathname.startsWith("/chat");

  if (PUBLIC_PATHS.has(pathname)) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <MobileSidebar />
        <div
          className={cn(
            "mx-auto w-full",
            isChatPath
              ? "h-[calc(100dvh-3.5rem)] min-h-0 px-0 py-0 md:h-full"
              : "px-4 py-4 md:px-6 md:py-6"
          )}
        >
          {children}
        </div>
      </main>
      <FloatingChat />
    </div>
  );
}
