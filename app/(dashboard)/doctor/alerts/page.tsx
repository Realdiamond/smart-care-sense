"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Bell, BellOff, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertBadge } from "@/components/shared/alert-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";


const supabase = createClient();
interface EmergencyAlert {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  metric_type: string | null;
  metric_value: number | null;
  message: string;
  doctor_notes: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  patient_name?: string;
}

export default function DoctorAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { document.title = "Patient Alerts — HealthPulse"; }, []);

  const load = async () => {
    if (!user) return;
    const { data: alertData, error } = await supabase
      .from("emergency_alerts")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && alertData) {
      const pids = [...new Set(alertData.map((a: any) => a.patient_id))];
      const { data: profData } = pids.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", pids)
        : { data: [] };
      const pm: Record<string, string> = {};
      (profData ?? []).forEach((p: any) => { pm[p.id] = p.full_name ?? "Unknown"; });
      setAlerts(alertData.map((a: any) => ({ ...a, patient_name: pm[a.patient_id] ?? "Unknown Patient" })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("doc-emergency-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts", filter: `doctor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const acknowledge = async (id: string) => {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), doctor_notes: notes[id] || null })
      .eq("id", id);
    if (error) toast.error("Failed to acknowledge"); else toast.success("Alert acknowledged");
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), doctor_notes: notes[id] || null })
      .eq("id", id);
    if (error) toast.error("Failed to resolve"); else toast.success("Alert resolved");
  };

  const active   = alerts.filter(a => a.status === "triggered");
  const acked    = alerts.filter(a => a.status === "acknowledged");
  const resolved = alerts.filter(a => a.status === "resolved");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-destructive" />
              <span className="text-gradient-primary">Patient Alerts</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Emergency and abnormal vital alerts from your assigned patients.
            </p>
          </div>
          {active.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">{active.length} unacknowledged</span>
            </div>
          )}
        </header>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Unacknowledged", count: active.length,   tone: "destructive" as const },
            { label: "Acknowledged",   count: acked.length,    tone: "warning"     as const },
            { label: "Resolved",       count: resolved.length, tone: "success"     as const },
          ].map(s => (
            <Card key={s.label} className="p-4 bg-card/40 backdrop-blur-xl border-border/60">
              <div className="text-2xl font-semibold">{s.count}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : alerts.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <BellOff className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No alerts</p>
            <p className="text-sm text-muted-foreground mt-1">All your patients' vitals are within normal ranges.</p>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-4">
              {alerts.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className={cn(
                    "p-5 border",
                    a.status === "triggered"    && "border-destructive/40 bg-destructive/5",
                    a.status === "acknowledged" && "border-warning/30 bg-warning/5",
                    a.status === "resolved"     && "border-border/40 bg-card/40 opacity-70"
                  )}>
                    <div className="flex items-start gap-4">
                      <UserAvatar name={a.patient_name} role="patient" size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/doctor/patients/${a.patient_id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                            {a.patient_name}
                          </Link>
                          <AlertBadge severity={a.status === "resolved" ? "resolved" : "critical"} />
                        </div>
                        <p className="text-sm text-foreground/90 mt-1">{a.message}</p>
                        {a.metric_type && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.metric_type.replace("_", " ")}: <strong>{a.metric_value}</strong>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{new Date(a.created_at).toLocaleString()}</p>

                        {/* Notes input for active alerts */}
                        {a.status !== "resolved" && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Add clinical notes (optional)…"
                              value={notes[a.id] ?? a.doctor_notes ?? ""}
                              onChange={e => setNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                              rows={2}
                              className="text-xs bg-background/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {a.status !== "resolved" && (
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/doctor/patients/${a.patient_id}`}><MessageSquare className="h-3.5 w-3.5" />View Patient</Link>
                        </Button>
                        {a.status === "triggered" && (
                          <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)} className="border-warning/40 text-warning hover:bg-warning/10">
                            Acknowledge
                          </Button>
                        )}
                        <Button size="sm" className="bg-gradient-primary" onClick={() => resolve(a.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Resolved
                        </Button>
                      </div>
                    )}

                    {a.doctor_notes && a.status === "resolved" && (
                      <p className="mt-3 text-xs text-muted-foreground border-t border-border/40 pt-2">
                        <strong>Notes:</strong> {a.doctor_notes}
                      </p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}
