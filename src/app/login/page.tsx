"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Button 
} from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2,
  ShieldCheck,
  Zap
} from "lucide-react";

function getAuthErrorMessage(action: "signin" | "signup", rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("email rate limit exceeded")) {
    return "確認メールの送信回数が上限に達しました。しばらく待ってから再度お試しください。";
  }

  if (action === "signup") {
    return `アカウント作成に失敗しました: ${rawMessage}`;
  }

  return `ログインに失敗しました: ${rawMessage}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<"signin" | "signup" | null>(null);
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

      toast.success("おかえりなさい！");
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

      toast.success("アカウントを作成しました。メールを確認してください。");

      if (data.session) {
        router.replace("/");
        router.refresh();
      }
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden px-4">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      {/* Mesh Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,17,17,0)_0%,rgba(9,9,11,1)_100%)]" />

      <div className="relative w-full max-w-[440px]">
        {/* Brand Logo Section */}
        <div className="flex flex-col items-center mb-10 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 scale-150 animate-pulse" />
                <div className="relative h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border border-white/20 flex items-center justify-center shadow-2xl rotate-3">
                    <Zap className="h-9 w-9 text-blue-600 fill-blue-600/10" />
                </div>
            </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            SHUKATSU <span className="text-blue-500">PRO</span>
          </h1>
          <p className="text-zinc-400 font-medium">効率的な就活管理で、納得の内定へ。</p>
        </div>

        <Card className="border-none bg-white/10 dark:bg-white/5 backdrop-blur-xl shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="p-8 pb-4 text-center">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              アカウントにサインイン
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-400 pl-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-12 rounded-2xl border-none bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/40 text-white placeholder:text-zinc-600 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-400 pl-1">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-12 rounded-2xl border-none bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/40 text-white placeholder:text-zinc-600 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                className="h-12 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 active:scale-95 group overflow-hidden relative"
                onClick={handleSignIn}
                disabled={loadingType !== null}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {loadingType === "signin" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        ログイン
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-100" />
              </Button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-tighter text-zinc-600">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <Button
                variant="ghost"
                className="h-12 rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
                onClick={handleSignUp}
                disabled={loadingType !== null}
              >
                {loadingType === "signup" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "新しいアカウントを作成"
                )}
              </Button>
            </div>
          </CardContent>
          <div className="bg-white/5 p-4 text-center border-t border-white/10">
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                 <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
                 Premium Career Management
                 <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
              </div>
          </div>
        </Card>
        
        <p className="mt-8 text-center text-xs text-zinc-500 font-medium">
          © 2026 SHUKATSU PRO. All rights reserved.
        </p>
      </div>
    </div>
  );
}
