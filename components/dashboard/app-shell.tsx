"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { PATIENT_NAV, DOCTOR_NAV, ADMIN_NAV } from "@/config/navigation";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { getRoleLabel } from "@/config/roles";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { role } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  const nav = role === "admin" ? ADMIN_NAV : role === "doctor" ? DOCTOR_NAV : PATIENT_NAV;
  const roleLabel = getRoleLabel(role);
  const displayName = profile?.full_name || user?.email || "User";

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Sidebar (desktop) ─── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar/60 backdrop-blur-xl sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="relative">
            <div className="absolute inset-0 rounded-full pulse-ring" />
            <div className="relative h-9 w-9 rounded-full bg-gradient-vital flex items-center justify-center">
              <HeartPulse className="h-4 w-4 text-vital-foreground heartbeat" />
            </div>
          </div>
          <div>
            <div className="text-base font-semibold leading-none text-gradient-primary">HealthPulse</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{roleLabel}</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary shadow-glow font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors">
            <UserAvatar name={displayName} email={user?.email} role={role} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{displayName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{roleLabel}</div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="h-8 w-8">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile top bar ─── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-vital flex items-center justify-center">
              <HeartPulse className="h-4 w-4 text-vital-foreground heartbeat" />
            </div>
            <div>
              <span className="font-semibold text-sm text-gradient-primary">HealthPulse</span>
              <span className="ml-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">{roleLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Scrollable nav pills */}
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-none">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Main content ─── */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8 mt-28 md:mt-0 overflow-y-auto"
      >
        {children}
      </motion.main>
    </div>
  );
}
