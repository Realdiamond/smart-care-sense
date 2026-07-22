"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, XCircle, Clock, Video, MapPin, Phone, Loader2, StickyNote } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AppointmentCard } from "@/components/shared/appointment-card";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { getDoctorAppointments, updateAppointmentStatus } from "@/services/appointmentService";
import type { Appointment } from "@/components/shared/appointment-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const supabase = createClient();
export default function DoctorAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "upcoming" | "past" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { document.title = "Appointments — KennyPulse"; }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getDoctorAppointments(user.id);
    setAppointments(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("doc-appts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const confirm = async (id: string) => {
    await updateAppointmentStatus(id, "confirmed", { doctor_notes: notes[id] });
    toast.success("Appointment confirmed");
  };

  const decline = async (id: string) => {
    await updateAppointmentStatus(id, "cancelled", { cancelled_reason: notes[id] || "Declined by doctor" });
    toast.success("Appointment declined");
  };

  const complete = async (id: string) => {
    await updateAppointmentStatus(id, "completed", { doctor_notes: notes[id] });
    toast.success("Appointment marked complete");
  };

  const now = new Date();
  const filtered = appointments.filter(a =>
    tab === "pending"   ? a.status === "pending" :
    tab === "upcoming"  ? new Date(a.scheduled_at) >= now && a.status !== "cancelled" && a.status !== "pending" :
    tab === "past"      ? new Date(a.scheduled_at) < now || a.status === "completed" || a.status === "cancelled" :
    true
  );

  const pendingCount = appointments.filter(a => a.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-gradient-primary">Appointments</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage patient appointment requests and schedule.</p>
        </header>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Pending",   value: appointments.filter(a=>a.status==="pending").length,   tone:"warning" },
            { label: "Confirmed", value: appointments.filter(a=>a.status==="confirmed").length, tone:"success" },
            { label: "Today",     value: appointments.filter(a=>a.scheduled_at.startsWith(now.toISOString().slice(0,10))).length, tone:"primary" },
            { label: "Completed", value: appointments.filter(a=>a.status==="completed").length, tone:"accent" },
          ].map(s => (
            <Card key={s.label} className="p-4 bg-card/40 text-center border-border/60">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="pending" className="relative">
              Pending {pendingCount > 0 && <span className="ml-1.5 h-4 w-4 rounded-full bg-warning text-[9px] font-bold text-white inline-flex items-center justify-center">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No {tab === "all" ? "" : tab} appointments</p>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-4">
              {filtered.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4 border border-border/60 bg-card/40 backdrop-blur-sm">
                    <AppointmentCard appointment={a} perspective="doctor" />

                    {a.patient_notes && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{a.patient_notes}</p>
                      </div>
                    )}

                    {(a.status === "pending" || a.status === "confirmed") && (
                      <div className="mt-3 space-y-2">
                        <Textarea placeholder="Add notes (optional)…" rows={1} className="text-xs bg-background/40 min-h-[36px]"
                          value={notes[a.id] ?? ""}
                          onChange={e => setNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          {a.status === "pending" && <>
                            <Button size="sm" onClick={() => confirm(a.id)} className="bg-gradient-primary flex-1">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => decline(a.id)} className="border-destructive/40 text-destructive hover:bg-destructive/10 flex-1">
                              <XCircle className="h-3.5 w-3.5 mr-1" />Decline
                            </Button>
                          </>}
                          {a.status === "confirmed" && new Date(a.scheduled_at) < now && (
                            <Button size="sm" onClick={() => complete(a.id)} className="bg-gradient-primary">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
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
