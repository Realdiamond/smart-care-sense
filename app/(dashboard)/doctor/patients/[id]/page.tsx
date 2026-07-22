"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, HeartPulse, Pill, AlertTriangle, Calendar, FileText, Plus, Loader2, Save, X } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertBadge } from "@/components/shared/alert-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VitalCard } from "@/components/dashboard/vital-card";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { getDoctorPatientPrescriptions, createPrescription, deactivatePrescription } from "@/services/prescriptionService";
import type { Prescription } from "@/services/prescriptionService";
import { METRICS, MetricType } from "@/lib/vitals";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const supabase = createClient();
interface PatientProfile {
  full_name: string; date_of_birth: string | null; sex: string | null;
  blood_type: string | null; height_cm: number | null; weight_kg: number | null;
  medical_conditions: string[]; medications: string[]; allergies: string[];
}
interface VitalSummary { metric_type: string; latest_value: number; recorded_at: string; }
interface AlertRow { id: string; severity: string; title: string; message: string; created_at: string; resolved_at: string | null; }

export default function PatientDetail() {
  const { id: patientId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile]           = useState<PatientProfile | null>(null);
  const [vitals, setVitals]             = useState<VitalSummary[]>([]);
  const [alerts, setAlerts]             = useState<AlertRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading]           = useState(true);

  // Prescription form
  const [rxOpen, setRxOpen]     = useState(false);
  const [rxForm, setRxForm]     = useState({ medication: "", dosage: "", frequency: "", start_date: new Date().toISOString().slice(0,10), end_date: "", instructions: "", refills: "0" });
  const [rxSaving, setRxSaving] = useState(false);

  useEffect(() => { document.title = "Patient Detail — KennyPulse"; }, []);

  useEffect(() => {
    if (!user || !patientId) return;
    (async () => {
      const [profRes, vitRes, alertRes, rxData] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("vitals_readings").select("metric_type, value, recorded_at").eq("user_id", patientId).order("recorded_at", { ascending: false }).limit(100),
        supabase.from("alerts").select("*").eq("user_id", patientId).order("created_at", { ascending: false }).limit(20),
        getDoctorPatientPrescriptions(user.id, patientId),
      ]);
      setProfile(profRes.data as PatientProfile);

      // Summarise: latest reading per metric type
      const seen = new Set<string>();
      const summary: VitalSummary[] = [];
      for (const v of vitRes.data ?? []) {
        if (!seen.has(v.metric_type)) { seen.add(v.metric_type); summary.push({ metric_type: v.metric_type, latest_value: v.value, recorded_at: v.recorded_at }); }
      }
      setVitals(summary);
      setAlerts((alertRes.data ?? []) as AlertRow[]);
      setPrescriptions(rxData);
      setLoading(false);
    })();
  }, [user, patientId]);

  const handleCreateRx = async () => {
    if (!user || !patientId) return;
    setRxSaving(true);
    try {
      const rx = await createPrescription({
        doctor_id:    user.id,
        patient_id:   patientId,
        medication:   rxForm.medication,
        dosage:       rxForm.dosage,
        frequency:    rxForm.frequency,
        start_date:   rxForm.start_date,
        end_date:     rxForm.end_date || null,
        instructions: rxForm.instructions || null,
        is_active:    true,
        refills:      parseInt(rxForm.refills) || 0,
      } as any);
      setPrescriptions(prev => [rx, ...prev]);
      toast.success("Prescription issued");
      setRxOpen(false);
    } catch (e: any) { toast.error(e.message); }
    setRxSaving(false);
  };

  const handleDeactivateRx = async (id: string) => {
    await deactivatePrescription(id);
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
    toast.success("Prescription deactivated");
  };

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;
  if (!profile) return <AppShell><div className="text-center py-16 text-muted-foreground">Patient not found or not accessible.</div></AppShell>;

  const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / 3.15576e10) : null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back + Header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
            <Link href="/doctor/patients"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Patients</Link>
          </Button>
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} role="patient" size="lg" />
            <div>
              <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {age && <Badge variant="secondary">{age} yrs</Badge>}
                {profile.sex && <Badge variant="secondary" className="capitalize">{profile.sex}</Badge>}
                {profile.blood_type && <Badge variant="outline">{profile.blood_type}</Badge>}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="vitals">
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="alerts">Alerts ({alerts.filter(a => !a.resolved_at).length})</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
            <TabsTrigger value="profile">Medical Profile</TabsTrigger>
          </TabsList>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="mt-4">
            {vitals.length === 0 ? (
              <Card className="p-10 text-center bg-card/40 text-muted-foreground"><HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-30" />No vitals recorded yet</Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vitals.map((v, i) => {
                  const meta = METRICS[v.metric_type as MetricType];
                  if (!meta) return null;
                  return <VitalCard key={v.metric_type} meta={meta} value={v.latest_value} history={[{ v: v.latest_value }]} index={i} />;
                })}
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <Card className="p-10 text-center bg-card/40 text-muted-foreground">No alerts for this patient</Card>
              ) : alerts.map(a => (
                <Card key={a.id} className={cn("p-4 border bg-card/40", !a.resolved_at ? "border-destructive/30" : "border-border/40 opacity-70")}>
                  <div className="flex items-start gap-3">
                    <AlertBadge severity={a.resolved_at ? "resolved" : a.severity} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="mt-4">
            <div className="flex justify-end mb-3">
              <Dialog open={rxOpen} onOpenChange={setRxOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Issue Prescription</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Issue New Prescription</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    {[
                      { label: "Medication", key: "medication", placeholder: "e.g. Lisinopril" },
                      { label: "Dosage",     key: "dosage",     placeholder: "e.g. 10mg" },
                      { label: "Frequency",  key: "frequency",  placeholder: "e.g. Once daily" },
                    ].map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label>{f.label}</Label>
                        <Input placeholder={f.placeholder} value={(rxForm as any)[f.key]} onChange={e => setRxForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Start Date</Label>
                        <Input type="date" value={rxForm.start_date} onChange={e => setRxForm(p => ({ ...p, start_date: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>End Date (optional)</Label>
                        <Input type="date" value={rxForm.end_date} onChange={e => setRxForm(p => ({ ...p, end_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Refills</Label>
                      <Input type="number" min="0" max="12" value={rxForm.refills} onChange={e => setRxForm(p => ({ ...p, refills: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Instructions</Label>
                      <Textarea placeholder="Special instructions for the patient…" rows={2} value={rxForm.instructions} onChange={e => setRxForm(p => ({ ...p, instructions: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setRxOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRx} disabled={!rxForm.medication || !rxForm.dosage || !rxForm.frequency || rxSaving} className="bg-gradient-primary">
                      {rxSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Prescription"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {prescriptions.map(p => (
                <Card key={p.id} className={cn("p-4 border flex items-start gap-3", p.is_active ? "border-success/20 bg-card/40" : "border-border/40 bg-card/20 opacity-60")}>
                  <Pill className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{p.medication}</span>
                      <Badge variant="outline" className={cn("text-[10px]", p.is_active ? "text-success border-success/40" : "text-muted-foreground")}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.dosage} · {p.frequency}</p>
                    {p.instructions && <p className="text-xs text-muted-foreground/70 mt-1">{p.instructions}</p>}
                    <p className="text-[11px] text-muted-foreground/50 mt-1">{new Date(p.start_date).toLocaleDateString()} {p.end_date ? `→ ${new Date(p.end_date).toLocaleDateString()}` : ""}</p>
                  </div>
                  {p.is_active && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeactivateRx(p.id)} className="shrink-0 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Medical Profile Tab */}
          <TabsContent value="profile" className="mt-4">
            <div className="space-y-4">
              {[
                { label: "Medical Conditions", items: profile.medical_conditions },
                { label: "Current Medications", items: profile.medications },
                { label: "Allergies",           items: profile.allergies },
              ].map(s => (
                <Card key={s.label} className="p-4 bg-card/40 border-border/60">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{s.label}</p>
                  {s.items.length === 0 ? <p className="text-sm text-muted-foreground">None recorded</p> : (
                    <div className="flex flex-wrap gap-2">
                      {s.items.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                    </div>
                  )}
                </Card>
              ))}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Height", value: profile.height_cm ? `${profile.height_cm} cm` : "—" },
                  { label: "Weight", value: profile.weight_kg ? `${profile.weight_kg} kg` : "—" },
                  { label: "BMI",    value: (profile.height_cm && profile.weight_kg) ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1) : "—" },
                ].map(s => (
                  <Card key={s.label} className="p-4 bg-card/40 border-border/60 text-center">
                    <p className="text-2xl font-semibold">{s.value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
