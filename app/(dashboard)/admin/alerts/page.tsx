"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, CheckCircle2, Loader2, AlertTriangle, Search } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertBadge } from "@/components/shared/alert-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const supabase = createClient();
interface PlatformAlert {
  id: string;
  user_id: string;
  severity: string;
  title: string;
  message: string;
  metric_type: string | null;
  metric_value: number | null;
  created_at: string;
  resolved_at: string | null;
  patient_name?: string;
}

export default function PlatformAlerts() {
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => { document.title = "Platform Alerts — HealthPulse"; }, []);

  const load = async () => {
    setLoading(true);
    const { data: alertData, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) { console.error("Failed to load alerts:", error.message); setLoading(false); return; }

    const userIds = [...new Set((alertData ?? []).map((r: any) => r.user_id))];
    const { data: profData } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const profMap: Record<string, string> = {};
    (profData ?? []).forEach((p: any) => { profMap[p.id] = p.full_name ?? "Unknown"; });

    setAlerts((alertData ?? []).map((r: any) => ({ ...r, patient_name: profMap[r.user_id] ?? "Unknown" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("admin-alerts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const resolveAlert = async (id: string) => {
    const { error } = await supabase.from("alerts").update({ resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Failed to resolve"); else toast.success("Alert resolved");
  };

  const filtered = alerts.filter(a => {
    const matchSev = severityFilter === "all" || a.severity === severityFilter;
    const matchSearch = !search || a.patient_name?.toLowerCase().includes(search.toLowerCase()) || a.title.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const counts = { critical: alerts.filter(a => a.severity === "critical" && !a.resolved_at).length, warning: alerts.filter(a => a.severity === "warning" && !a.resolved_at).length, total: alerts.length };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" /><span className="text-gradient-primary">Platform Alerts</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">System-wide view of all patient alerts across the platform.</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-destructive/5 border-destructive/20 text-center">
            <p className="text-2xl font-semibold text-destructive">{counts.critical}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Critical Active</p>
          </Card>
          <Card className="p-4 bg-warning/5 border-warning/20 text-center">
            <p className="text-2xl font-semibold text-warning">{counts.warning}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Warnings Active</p>
          </Card>
          <Card className="p-4 bg-card/40 border-border/60 text-center">
            <p className="text-2xl font-semibold">{counts.total}</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Total (All Time)</p>
          </Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by patient or alert…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 border-border/60">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No alerts found</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={cn("p-4 flex items-start gap-4 border", a.resolved_at ? "border-border/40 bg-card/30 opacity-65" : a.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-card/40")}>
                  <UserAvatar name={a.patient_name} role="patient" size="sm" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.patient_name}</span>
                      <AlertBadge severity={a.resolved_at ? "resolved" : a.severity} />
                    </div>
                    <p className="text-sm mt-0.5">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                    {a.metric_type && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{a.metric_type}: {a.metric_value}</p>}
                    <p className="text-[11px] text-muted-foreground/50 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  {!a.resolved_at && (
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(a.id)} className="shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolve
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
