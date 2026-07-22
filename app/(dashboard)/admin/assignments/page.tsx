"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Trash2, Search, ArrowRight, Loader2, Stethoscope, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";


const supabase = createClient();
interface Assignment { id: string; doctor_id: string; patient_id: string; doctor_name: string; patient_name: string; assigned_at: string; is_primary: boolean; }
interface UserOption { id: string; name: string; }

export default function DoctorPatientAssignment() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [doctors, setDoctors] = useState<UserOption[]>([]);
  const [patients, setPatients] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selDoctor, setSelDoctor] = useState("");
  const [selPatient, setSelPatient] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState("all");

  useEffect(() => { document.title = "Assignments — KennyPulse"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: aData, error: aError } = await supabase
      .from("doctor_patient_assignments")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (aError) { console.error("assignments load error:", aError.message); setLoading(false); return; }

    const allIds = [...new Set([(aData ?? []).map((r: any) => r.doctor_id), (aData ?? []).map((r: any) => r.patient_id)].flat())];
    const { data: profData } = allIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", allIds)
      : { data: [] };
    const profMap: Record<string, string> = {};
    (profData ?? []).forEach((p: any) => { profMap[p.id] = p.full_name ?? "Unknown"; });

    setAssignments((aData ?? []).map((r: any) => ({
      ...r,
      doctor_name:  profMap[r.doctor_id]  ?? "Unknown Doctor",
      patient_name: profMap[r.patient_id] ?? "Unknown Patient",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load user lists for dropdowns — two-query pattern to avoid FK join errors
  useEffect(() => {
    (async () => {
      const [dRes, pRes] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "doctor"),
        supabase.from("user_roles").select("user_id").eq("role", "patient"),
      ]);
      const doctorIds  = (dRes.data ?? []).map((r: any) => r.user_id);
      const patientIds = (pRes.data ?? []).map((r: any) => r.user_id);
      const allIds = [...new Set([...doctorIds, ...patientIds])];
      const { data: profData } = allIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", allIds)
        : { data: [] };
      const profMap: Record<string, string> = {};
      (profData ?? []).forEach((p: any) => { profMap[p.id] = p.full_name ?? "Unknown"; });
      setDoctors(doctorIds.map((id: string) => ({ id, name: profMap[id] ?? "Doctor" })));
      setPatients(patientIds.map((id: string) => ({ id, name: profMap[id] ?? "Patient" })));
    })();
  }, []);

  const handleAssign = async () => {
    if (!selDoctor || !selPatient || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("doctor_patient_assignments").insert({
        doctor_id: selDoctor, patient_id: selPatient, assigned_by: user.id, is_primary: true,
      });
      if (error) throw error;
      // Notify both parties
      const docName  = doctors.find(d => d.id === selDoctor)?.name  ?? "doctor";
      const patName  = patients.find(p => p.id === selPatient)?.name ?? "patient";
      await Promise.all([
        supabase.from("notifications").insert({ user_id: selPatient, type: "doctor_assigned", title: "Doctor Assigned", body: `Dr. ${docName} has been assigned as your primary doctor.`, action_url: "/messages" }),
        supabase.from("notifications").insert({ user_id: selDoctor,  type: "doctor_assigned", title: "New Patient Assigned", body: `${patName} has been assigned to your care.`, action_url: "/doctor/patients" }),
      ]);
      toast.success("Assignment created");
      setOpen(false); setSelDoctor(""); setSelPatient("");
      await load();
    } catch (e) { toast.error((e as Error).message ?? "Failed to assign"); }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("doctor_patient_assignments").delete().eq("id", id);
    if (error) toast.error("Failed to remove"); else { toast.success("Assignment removed"); await load(); }
  };

  const filtered = filterDoctor === "all" ? assignments : assignments.filter(a => a.doctor_id === filterDoctor);

  // Group by doctor
  const grouped: Record<string, Assignment[]> = {};
  filtered.forEach(a => { if (!grouped[a.doctor_id]) grouped[a.doctor_id] = []; grouped[a.doctor_id].push(a); });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" /><span className="text-gradient-primary">Doctor–Patient Assignments</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{assignments.length} active assignments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow"><Plus className="h-4 w-4 mr-2" />New Assignment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Assign Doctor to Patient</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Select Doctor</label>
                  <Select value={selDoctor} onValueChange={setSelDoctor}>
                    <SelectTrigger><SelectValue placeholder="Choose doctor…" /></SelectTrigger>
                    <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Select Patient</label>
                  <Select value={selPatient} onValueChange={setSelPatient}>
                    <SelectTrigger><SelectValue placeholder="Choose patient…" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={!selDoctor || !selPatient || saving} className="bg-gradient-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex items-center gap-3">
          <Select value={filterDoctor} onValueChange={setFilterDoctor}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Filter by doctor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map(d => <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-12 text-center bg-card/40 border-border/60">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No assignments yet</p>
            <p className="text-sm text-muted-foreground mt-1">Assign doctors to patients to enable monitoring and communication.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([doctorId, group]) => (
              <Card key={doctorId} className="p-5 border border-border/60 bg-card/40">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/40">
                  <UserAvatar name={group[0].doctor_name} role="doctor" size="md" />
                  <div>
                    <p className="font-semibold text-sm">Dr. {group[0].doctor_name}</p>
                    <p className="text-xs text-muted-foreground">{group.length} patient{group.length !== 1 ? "s" : ""} assigned</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.map(a => (
                    <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <UserAvatar name={a.patient_name} role="patient" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.patient_name}</p>
                        <p className="text-[11px] text-muted-foreground">Assigned {new Date(a.assigned_at).toLocaleDateString()}</p>
                      </div>
                      {a.is_primary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(a.id)} className="h-7 w-7 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
