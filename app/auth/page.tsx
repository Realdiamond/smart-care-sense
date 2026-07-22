"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getRoleDefaultRoute } from "@/config/roles";
import { useAuth } from "@/components/providers/auth-provider";
import type { UserRole } from "@/types/roles";

export default function AuthPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "signup" || mode === "register") {
        setTab("signup");
      } else if (mode === "signin" || mode === "login") {
        setTab("signin");
      }
    }
  }, []);

  // If already authenticated, redirect via useEffect to avoid "update while rendering" error
  useEffect(() => {
    if (!loading && user && role) {
      router.replace(getRoleDefaultRoute(role));
    }
  }, [user, role, loading, router]);

  if (!loading && user && role) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");

    // Fetch role and redirect
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .maybeSingle();
      const r = (roleData?.role as UserRole) ?? "patient";
      router.replace(getRoleDefaultRoute(r));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You've been signed in as a Patient.");
    router.replace("/patient");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full pulse-ring" />
            <div className="relative h-14 w-14 rounded-full bg-gradient-vital flex items-center justify-center shadow-vital">
              <HeartPulse className="h-7 w-7 text-vital-foreground heartbeat" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-gradient-primary">KennyPulse</h1>
          <p className="text-sm text-muted-foreground">Your vitals. Intelligently monitored.</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          {/* Tab selector */}
          <div className="grid grid-cols-2 gap-1 mb-6 bg-muted/40 rounded-xl p-1">
            <button
              onClick={() => setTab("signin")}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Sign in form */}
          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Are you a Doctor or Admin?{" "}
                <span className="text-primary">Contact your administrator for login credentials.</span>
              </p>
            </form>
          )}

          {/* Sign up form */}
          {tab === "signup" && (
            <>
              <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary font-medium">Patient Registration</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New accounts are registered as Patients. Doctors are created by Administrators.
                </p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Full name</label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email2" className="text-sm font-medium">Email</label>
                  <input
                    id="email2"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password2" className="text-sm font-medium">Password</label>
                  <input
                    id="password2"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Patient Account"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree this is a wellness tool, not a substitute for professional medical advice.
        </p>
      </div>
    </main>
  );
}
