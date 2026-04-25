import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionManager } from "@/components/auth-session-manager";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { ChatSessionProvider } from "@/components/chat-session-provider";
import { PWARegister } from "@/components/pwa-register";
import { SWRProvider } from "@/components/swr-config";

export const metadata: Metadata = {
  title: "就活管理",
  description: "就職活動を一元管理するアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "就活管理",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
      </head>
      <body
        className={`antialiased relative min-h-screen overflow-x-hidden`}
      >
        <PWARegister />
        <SWRProvider>
          <TooltipProvider>
            <AuthSessionManager />
            <AuthGuard>
              <ChatSessionProvider>
                <AppShell>{children}</AppShell>
                <Toaster />
              </ChatSessionProvider>
            </AuthGuard>
          </TooltipProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
