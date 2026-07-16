"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, HeartPulse, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";


const supabase = createClient();
interface Patient {
  id: string;
  name: string;
  email: string;
  age: number | null;
  blood_type: string | null;
  conditions: string[];
  assignedAt: string;
  criticalAlerts: number;
  lastSeen: string | null;
}

export default function PatientList() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "My Patients — HealthPulse"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get assigned patients with their profiles
      const { data: assignments } = await supabase
        .from("doctor_patient_assignments")
        .select("patient_id, assigned_at")
        .eq("doctor_id", user.id);

      if (!assignments) { setLoading(false); return; }

      const patientIds = assignments.map((a: any) => a.patient_id);
      
      const { data: profData } = patientIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, date_of_birth, blood_type, medical_conditions").in("id", patientIds)
        : { data: [] };
      const profMap: Record<string, any> = {};
      (profData ?? []).forEach((p: any) => { profMap[p.id] = p; });

      // Get alert counts per patient
      const { data: alerts } = patientIds.length > 0
        ? await supabase.from("emergency_alerts").select("patient_id").in("patient_id", patientIds).eq("status", "triggered")
        : { data: [] };

      const alertCount: Record<string, number> = {};
      (alerts ?? []).forEach((a: any) => { alertCount[a.patient_id] = (alertCount[a.patient_id] ?? 0) + 1; });

      // Get last vitals reading per patient
      const lastSeenMap: Record<string, string> = {};
      for (const pid of patientIds) {
        const { data: vit } = await supabase
          .from("vitals_readings").select("recorded_at").eq("user_id", pid).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
        if (vit) lastSeenMap[pid] = vit.recorded_at;
      }

      setPatients(assignments.map((a: any) => {
        const p = profMap[a.patient_id] ?? {};
        const dob = p.date_of_birth ? new Date(p.date_of_birth) : null;
        const age = dob ? Math.floor((Date.now() - dob.getTime()) / 3.15576e10) : null;
        return {
          id: a.patient_id,
          name: p.full_name ?? "Unknown Patient",
          email: "",
          age,
          blood_type: p.blood_type ?? null,
          conditions: p.medical_conditions ?? [],
          assignedAt: a.assigned_at,
          criticalAlerts: alertCount[a.patient_id] ?? 0,
          lastSeen: lastSeenMap[a.patient_id] ?? null,
        };
      }));
      setLoading(false);
    })();
  }, [user]);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">My Patients</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{patients.length} patient{patients.length !== 1 ? "s" : ""} assigned</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">{search ? "No patients found" : "No patients assigned yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">Patients are assigned by your administrator.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/doctor/patients/${p.id}`}>
                  <Card className={cn(
                    "p-4 flex items-center gap-4 hover:bg-card/70 transition-colors cursor-pointer border",
                    p.criticalAlerts > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-card/40"
                  )}>
                    <UserAvatar name={p.name} role="patient" size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.criticalAlerts > 0 && (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />{p.criticalAlerts} alert{p.criticalAlerts > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {p.blood_type && <Badge variant="secondary" className="text-[10px]">{p.blood_type}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {p.age && <span className="text-xs text-muted-foreground">{p.age} yrs</span>}
                        {p.conditions.length > 0 && (
                          <span className="text-xs text-muted-foreground">{p.conditions.slice(0, 2).join(", ")}{p.conditions.length > 2 ? ` +${p.conditions.length - 2}` : ""}</span>
                        )}
                        {p.lastSeen && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <HeartPulse className="h-3 w-3" />Last reading {new Date(p.lastSeen).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
