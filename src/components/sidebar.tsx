"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Calendar,
  Search,
  FileText,
  Settings,
  GraduationCap,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  {
    href: "/",
    label: "ダッシュボード",
    icon: LayoutDashboard,
  },
  {
    href: "/companies",
    label: "企業一覧",
    icon: Building2,
  },
  {
    href: "/tasks",
    label: "タスク",
    icon: CheckSquare,
  },
  {
    href: "/calendar",
    label: "カレンダー",
    icon: Calendar,
  },
  {
    href: "/self-analysis",
    label: "自己分析",
    icon: Search,
  },
  {
    href: "/es",
    label: "ES一覧",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
  },
];

interface NavLinksProps {
  pathname: string;
  onNavigate?: () => void;
}

function NavLinks({ pathname, onNavigate }: NavLinksProps) {
  return (
    <>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="md:hidden">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sticky top-0 h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">就活マネージャー</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <NavLinks pathname={pathname} />
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <LogoutButton />
        <p className="text-xs text-muted-foreground text-center">
          就活管理アプリ v1.0
        </p>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="メニューを開く">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold">就活マネージャー</span>
          </div>
          <nav className="space-y-1 p-4">
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="pt-2">
              <LogoutButton />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold">就活マネージャー</span>
      <div className="h-8 w-8" aria-hidden="true" />
    </div>
  );
}
