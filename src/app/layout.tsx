import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionManager } from "@/components/auth-session-manager";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "就活マネージャー",
  description: "就職活動を一元管理するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden`}
      >
        <TooltipProvider>
          <AuthSessionManager />
          <AuthGuard>
            <AppShell>{children}</AppShell>
            <Toaster />
          </AuthGuard>
        </TooltipProvider>
      </body>
    </html>
  );
}
