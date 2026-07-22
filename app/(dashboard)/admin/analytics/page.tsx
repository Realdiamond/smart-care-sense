"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Stethoscope, Calendar, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";


const supabase = createClient();
const COLORS = ["hsl(168,84%,52%)", "hsl(188,95%,58%)", "hsl(258,80%,70%)", "hsl(38,95%,60%)", "hsl(354,85%,62%)"];

export default function PlatformAnalytics() {
  const [loading, setLoading] = useState(true);
  const [roleBreakdown, setRoleBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [apptByType, setApptByType]       = useState<{ name: string; count: number }[]>([]);
  const [apptByStatus, setApptByStatus]   = useState<{ name: string; count: number }[]>([]);
  const [dailySignups, setDailySignups]   = useState<{ day: string; users: number }[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAppointments: 0, totalAlerts: 0, totalPrescriptions: 0 });

  useEffect(() => { document.title = "Analytics — KennyPulse"; }, []);

  useEffect(() => {
    (async () => {
      const [roleRes, apptRes, alertRes, rxRes] = await Promise.all([
        supabase.from("user_roles").select("role"),
        supabase.from("appointments").select("type, status"),
        supabase.from("alerts").select("id", { count: "exact" }),
        supabase.from("prescriptions").select("id", { count: "exact" }),
      ]);

      const roles = roleRes.data ?? [];
      const roleMap: Record<string, number> = {};
      roles.forEach((r: any) => { roleMap[r.role] = (roleMap[r.role] ?? 0) + 1; });
      setRoleBreakdown(Object.entries(roleMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

      const appts = apptRes.data ?? [];
      const typeMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      appts.forEach((a: any) => {
        typeMap[a.type]     = (typeMap[a.type]     ?? 0) + 1;
        statusMap[a.status] = (statusMap[a.status] ?? 0) + 1;
      });
      setApptByType(Object.entries(typeMap).map(([name, count]) => ({ name: name.replace("_", " "), count })));
      setApptByStatus(Object.entries(statusMap).map(([name, count]) => ({ name: name.replace("_", " "), count })));

      // Last 14 days signups
      const days: { day: string; users: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const { count } = await supabase.from("user_roles").select("user_id", { count: "exact" }).gte("created_at", iso).lte("created_at", iso + "T23:59:59");
        days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), users: count ?? 0 });
      }
      setDailySignups(days);

      setStats({ totalUsers: roles.length, totalAppointments: appts.length, totalAlerts: alertRes.count ?? 0, totalPrescriptions: rxRes.count ?? 0 });
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: "Total Users",        value: stats.totalUsers,        icon: Users,          tone: "primary"     as const },
    { label: "Appointments",       value: stats.totalAppointments, icon: Calendar,       tone: "success"     as const },
    { label: "Total Alerts",       value: stats.totalAlerts,       icon: AlertTriangle,  tone: "warning"     as const },
    { label: "Prescriptions",      value: stats.totalPrescriptions,icon: Activity,       tone: "accent"      as const },
  ];

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
  const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /><span className="text-gradient-primary">Platform Analytics</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time platform metrics and insights.</p>
        </header>

        <StatsGrid stats={statCards} cols={4} />

        {/* Daily signups */}
        <Card className="glass-card p-5">
          <h2 className="font-semibold mb-4">New User Signups — Last 14 Days</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySignups} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={tickStyle} />
                <YAxis tick={tickStyle} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Role breakdown */}
          <Card className="glass-card p-5">
            <h2 className="font-semibold mb-4">User Role Breakdown</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {roleBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Appointments by type */}
          <Card className="glass-card p-5">
            <h2 className="font-semibold mb-4">Appointments by Type</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apptByType} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={tickStyle} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0,4,4,0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Appointments by status */}
          <Card className="glass-card p-5">
            <h2 className="font-semibold mb-4">Appointments by Status</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={apptByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="count">
                    {apptByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
