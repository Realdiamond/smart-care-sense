"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Stethoscope, AlertTriangle, Calendar, Activity, ArrowRight, ShieldAlert, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { StatsGrid } from "@/components/shared/stats-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";


const supabase = createClient();
export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalPatients: 0, totalDoctors: 0, totalAlerts: 0, totalAppts: 0, pendingVerification: 0, activeEmergencies: 0 });
  const [activityData, setActivityData] = useState<{ day: string; alerts: number; appointments: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Admin Dashboard — KennyPulse"; }, []);

  useEffect(() => {
    (async () => {
      const [pRes, dRes, aRes, apptRes, pendRes, emRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "patient"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "doctor"),
        supabase.from("alerts").select("id", { count: "exact" }).is("resolved_at", null),
        supabase.from("appointments").select("id", { count: "exact" }),
        supabase.from("doctor_profiles").select("id", { count: "exact" }).eq("is_verified", false),
        supabase.from("emergency_alerts").select("id", { count: "exact" }).eq("status", "triggered"),
      ]);

      setStats({
        totalPatients:      pRes.count   ?? 0,
        totalDoctors:       dRes.count   ?? 0,
        totalAlerts:        aRes.count   ?? 0,
        totalAppts:         apptRes.count ?? 0,
        pendingVerification: pendRes.count ?? 0,
        activeEmergencies:  emRes.count  ?? 0,
      });

      // Last 7 days activity
      const days: { day: string; alerts: number; appointments: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const [da, dap] = await Promise.all([
          supabase.from("alerts").select("id", { count: "exact" }).gte("created_at", iso).lte("created_at", iso + "T23:59:59"),
          supabase.from("appointments").select("id", { count: "exact" }).gte("created_at", iso).lte("created_at", iso + "T23:59:59"),
        ]);
        days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), alerts: da.count ?? 0, appointments: dap.count ?? 0 });
      }
      setActivityData(days);
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: "Total Patients",       value: stats.totalPatients,       icon: Users,         tone: "primary"     as const },
    { label: "Total Doctors",        value: stats.totalDoctors,        icon: Stethoscope,   tone: "accent"      as const },
    { label: "Active Alerts",        value: stats.totalAlerts,         icon: AlertTriangle, tone: "warning"     as const },
    { label: "Appointments",         value: stats.totalAppts,          icon: Calendar,      tone: "success"     as const },
    { label: "Pending Verification", value: stats.pendingVerification, icon: ShieldAlert,   tone: "destructive" as const, description: "Doctor accounts" },
    { label: "Active Emergencies",   value: stats.activeEmergencies,   icon: Activity,      tone: "vital"       as const, description: "Unacknowledged" },
  ];

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">
            Admin Dashboard,{" "}
            <span className="text-gradient-primary">{profile?.full_name?.split(" ")[0] ?? "Admin"}.</span>
          </h1>
        </header>

        {stats.pendingVerification > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {stats.pendingVerification} doctor account{stats.pendingVerification > 1 ? "s" : ""} awaiting verification
              </p>
            </div>
            <Button asChild size="sm" className="bg-destructive text-white hover:bg-destructive/90">
              <Link href="/admin/verify">Verify Now <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </motion.div>
        )}

        <StatsGrid stats={statCards} cols={3} />

        {/* Activity Chart */}
        <Card className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Platform Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days — alerts and appointments</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/analytics">Full Analytics <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="alerts" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Alerts" />
                <Line type="monotone" dataKey="appointments" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Appointments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: "/admin/users",       label: "Manage Users",      icon: Users,         desc: "View all users" },
            { to: "/admin/assignments", label: "Assignments",        icon: Stethoscope,   desc: "Doctor–Patient pairs" },
            { to: "/admin/alerts",      label: "All Alerts",         icon: AlertTriangle, desc: "System-wide alerts" },
            { to: "/admin/settings",    label: "Settings",           icon: Activity,      desc: "System configuration" },
          ].map(l => {
            const Icon = l.icon;
            return (
              <Link key={l.to} href={l.to}>
                <Card className="p-4 border border-border/60 bg-card/40 hover:bg-card/70 hover:border-primary/30 transition-all cursor-pointer group">
                  <Icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm">{l.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
