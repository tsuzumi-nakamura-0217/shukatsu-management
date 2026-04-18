"use client";

import { MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const HIDDEN_PATHS = new Set(["/login"]);

export function FloatingChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDDEN_PATHS.has(pathname) || pathname.startsWith("/chat")) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg md:right-6 md:bottom-6"
          aria-label="就活AIチャットを開く"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="h-dvh w-full max-w-115 gap-0 overflow-hidden p-0 sm:max-w-115 [&>button]:top-6 [&>button]:right-6"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>就活AIチャット</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <ChatPanel compact className="h-full min-h-0" scrollTrigger={open ? 1 : 0} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
