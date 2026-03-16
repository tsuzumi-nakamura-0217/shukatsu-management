"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

function getAuthErrorMessage(action: "signin" | "signup", rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("email rate limit exceeded")) {
    return "確認メールの送信回数が上限に達しました。しばらく待ってから再度お試しください。開発中は Supabase の Confirm email を一時的にOFFにすると回避できます。";
  }

  if (action === "signup") {
    return `アカウント作成に失敗しました: ${rawMessage}`;
  }

  return `ログインに失敗しました: ${rawMessage}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<"signin" | "signup" | null>(
    null
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignIn() {
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoadingType("signin");
    try {
      const supabaseBrowser = getSupabaseBrowserClient();
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(getAuthErrorMessage("signin", error.message));
        return;
      }

      toast.success("ログインしました");

      // Trigger local synchronization in development mode
      if (process.env.NODE_ENV === "development") {
        try {
          const { data: sessionData } = await supabaseBrowser.auth.getSession();
          if (sessionData.session) {
            await fetch("/api/local-sync", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            });
            toast.info("ローカルデータを同期しました");
          }
        } catch (syncError) {
          console.error("Local sync failed:", syncError);
        }
      }

      router.replace("/");
      router.refresh();
    } finally {
      setLoadingType(null);
    }
  }

  async function handleSignUp() {
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoadingType("signup");
    try {
      const supabaseBrowser = getSupabaseBrowserClient();
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(getAuthErrorMessage("signup", error.message));
        return;
      }

      toast.success(
        "アカウントを作成しました。メール確認が有効な場合は確認メールをチェックしてください。"
      );

      if (data.session) {
        router.replace("/");
        router.refresh();
      }
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">就活マネージャーにログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            メールアドレス認証でログインすると、あなた専用のデータで利用できます。
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="8文字以上を推奨"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={loadingType !== null}
            >
              {loadingType === "signin" ? "ログイン中..." : "ログイン"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignUp}
              disabled={loadingType !== null}
            >
              {loadingType === "signup" ? "作成中..." : "新規登録"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
