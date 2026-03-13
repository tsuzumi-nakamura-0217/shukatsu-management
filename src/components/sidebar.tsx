"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    href: "/templates",
    label: "テンプレート",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">就活マネージャー</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
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
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          就活管理アプリ v1.0
        </p>
      </div>
    </aside>
  );
}
