"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, Calendar, BarChart3, TrendingUp, HeartPulse, Sparkles, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { StatsGrid } from "@/components/shared/stats-grid";
import { AppointmentCard } from "@/components/shared/appointment-card";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { getDoctorAppointments } from "@/services/appointmentService";
import type { Appointment } from "@/components/shared/appointment-card";


const supabase = createClient();
export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ patients: 0, criticalAlerts: 0, todayAppts: 0, pendingAppts: 0 });
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Doctor Dashboard — KennyPulse"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const [patRes, apptData, alertsRes] = await Promise.all([
        supabase.from("doctor_patient_assignments").select("id", { count: "exact" }).eq("doctor_id", user.id),
        getDoctorAppointments(user.id),
        supabase.from("emergency_alerts").select("*").eq("doctor_id", user.id).eq("status", "triggered").order("created_at", { ascending: false }).limit(5),
      ]);

      const todayAppts = apptData.filter(a => a.scheduled_at >= todayStart && a.scheduled_at <= todayEnd);
      const pending    = apptData.filter(a => a.status === "pending");
      const upcoming   = apptData.filter(a => a.scheduled_at > new Date().toISOString() && a.status !== "cancelled").slice(0, 4);

      setStats({
        patients: patRes.count ?? 0,
        criticalAlerts: alertsRes.data?.length ?? 0,
        todayAppts: todayAppts.length,
        pendingAppts: pending.length,
      });
      setUpcomingAppts(upcoming);
      setRecentAlerts(alertsRes.data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Doctor";

  const statCards = [
    { label: "My Patients",        value: stats.patients,      icon: Users,          tone: "primary"     as const },
    { label: "Critical Alerts",    value: stats.criticalAlerts, icon: AlertTriangle,  tone: "destructive" as const, description: "Unacknowledged" },
    { label: "Appointments Today", value: stats.todayAppts,    icon: Calendar,       tone: "success"     as const },
    { label: "Pending Requests",   value: stats.pendingAppts,  icon: BarChart3,      tone: "warning"     as const },
  ];

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Greeting */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-1">
              Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
              <span className="text-gradient-primary">Dr. {firstName}.</span>
            </h1>
          </div>
          {stats.criticalAlerts > 0 && (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1.5 h-8 px-3 text-sm animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              {stats.criticalAlerts} critical alert{stats.criticalAlerts > 1 ? "s" : ""} need attention
            </Badge>
          )}
        </header>

        {/* Stats */}
        <StatsGrid stats={statCards} cols={4} />

        {/* Alerts + Appointments */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Emergency Alerts */}
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <h2 className="font-semibold">Emergency Alerts</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/doctor/alerts">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
            {recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No active emergency alerts
              </div>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((a) => (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-destructive">{a.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {a.metric_type && `${a.metric_type.replace("_"," ")}: ${a.metric_value} · `}
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10">
                      <Link href={`/doctor/alerts`}>Respond</Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Appointments */}
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold">Upcoming Appointments</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/doctor/appointments">Manage <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
            {upcomingAppts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No upcoming appointments
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.map(a => (
                  <AppointmentCard key={a.id} appointment={a} perspective="doctor" />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* AI Insight strip */}
        <Card className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-primary mb-1">Clinical AI Insight</div>
            <p className="text-sm text-foreground/90">
              {stats.patients > 0
                ? `You have ${stats.patients} active patient${stats.patients > 1 ? "s" : ""}. ${stats.criticalAlerts > 0 ? `${stats.criticalAlerts} require immediate attention.` : "All vitals appear stable across your patient roster."}`
                : "No patients assigned yet. Contact your administrator to get started."}
            </p>
          </div>
          {stats.patients > 0 && (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Link href="/doctor/patients">View Patients</Link>
            </Button>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
