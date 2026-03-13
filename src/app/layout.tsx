import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileSidebar, Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <div className="min-h-screen md:flex">
            <Sidebar />
            <main className="flex-1 bg-background">
              <MobileSidebar />
              <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
