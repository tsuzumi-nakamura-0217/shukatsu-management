"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabaseBrowser = getSupabaseBrowserClient();
    await supabaseBrowser.auth.signOut();
    document.cookie = "sb-access-token=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/login");
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      ログアウト
    </Button>
  );
}
