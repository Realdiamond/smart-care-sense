"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, Clock, Video, Phone, MapPin, Loader2, X, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentCard } from "@/components/shared/appointment-card";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { createAppointment, getPatientAppointments, getDoctorAvailableSlots, updateAppointmentStatus } from "@/services/appointmentService";
import { toast } from "sonner";
import type { Appointment } from "@/components/shared/appointment-card";
import { cn } from "@/lib/utils";


const supabase = createClient();
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");

  // Booking state
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string }[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [apptType, setApptType] = useState<string>("in_person");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());

  useEffect(() => { document.title = "Appointments — KennyPulse"; }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPatientAppointments(user.id);
      setAppointments(data);
    } catch { toast.error("Failed to load appointments"); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("appts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  // Load available doctors on open
  useEffect(() => {
    if (!bookOpen) return;
    (async () => {
      const { data: assignments } = await supabase
        .from("doctor_patient_assignments")
        .select("doctor_id")
        .eq("patient_id", user!.id);
        
      const doctorIds = (assignments ?? []).map((a: any) => a.doctor_id);
      
      if (doctorIds.length > 0) {
        const [profRes, docProfRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", doctorIds),
          supabase.from("doctor_profiles").select("user_id, specialty").in("user_id", doctorIds)
        ]);
        
        const profMap: Record<string, string> = {};
        (profRes.data ?? []).forEach((p: any) => { profMap[p.id] = p.full_name ?? "Doctor"; });
        
        const specMap: Record<string, string> = {};
        (docProfRes.data ?? []).forEach((p: any) => { specMap[p.user_id] = p.specialty ?? ""; });

        setDoctors(doctorIds.map((id: string) => ({
          id,
          name: profMap[id] ?? "Doctor",
          specialty: specMap[id] ?? ""
        })));
      } else {
        setDoctors([]);
      }
    })();
  }, [bookOpen, user]);

  // Load slots when doctor + date selected
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) { setSlots([]); return; }
    getDoctorAvailableSlots(selectedDoctor, selectedDate).then(setSlots);
  }, [selectedDoctor, selectedDate]);

  const handleBook = async () => {
    if (!user || !selectedDoctor || !selectedSlot) return;
    setBooking(true);
    try {
      await createAppointment({
        patient_id: user.id,
        doctor_id: selectedDoctor,
        scheduled_at: selectedSlot,
        type: apptType as any,
        patient_notes: notes || undefined,
      });
      toast.success("Appointment requested! Awaiting doctor confirmation.");
      setBookOpen(false);
      setSelectedDoctor(""); setSelectedDate(""); setSelectedSlot(""); setNotes(""); setApptType("in_person");
    } catch (e: any) { toast.error(e.message); }
    setBooking(false);
  };

  const handleCancel = async (id: string) => {
    try {
      await updateAppointmentStatus(id, "cancelled", { cancelled_reason: "Cancelled by patient" });
      toast.success("Appointment cancelled");
    } catch { toast.error("Failed to cancel"); }
  };

  const now = new Date();
  const filtered = appointments.filter(a =>
    tab === "upcoming" ? new Date(a.scheduled_at) >= now :
    tab === "past"     ? new Date(a.scheduled_at) < now  : true
  );

  // Calendar helpers
  const calDays = () => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const last  = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const days: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    return days;
  };

  const bookedDates = new Set(appointments.map(a => a.scheduled_at.slice(0, 10)));

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Appointments</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your healthcare appointments.</p>
          </div>
          <Dialog open={bookOpen} onOpenChange={setBookOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4 mr-2" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Book an Appointment</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Select Doctor</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger><SelectValue placeholder="Choose your doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.length === 0 && <SelectItem value="_none" disabled>No assigned doctors yet</SelectItem>}
                      {doctors.map(d => (
                        <SelectItem key={d.id} value={d.id}>Dr. {d.name} — {d.specialty}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Appointment Type</Label>
                  <Select value={apptType} onValueChange={setApptType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person"><MapPin className="h-3 w-3 inline mr-1" />In Person</SelectItem>
                      <SelectItem value="video"><Video className="h-3 w-3 inline mr-1" />Video Call</SelectItem>
                      <SelectItem value="phone"><Phone className="h-3 w-3 inline mr-1" />Phone Call</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mini Calendar */}
                <div className="space-y-1.5">
                  <Label>Select Date</Label>
                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1,1))} className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-4 w-4"/></button>
                      <span className="text-sm font-medium">{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
                      <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1,1))} className="p-1 hover:bg-muted rounded"><ChevronRight className="h-4 w-4"/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAYS.map(d => <div key={d} className="text-[10px] text-muted-foreground py-1">{d}</div>)}
                      {calDays().map((d, i) => {
                        if (!d) return <div key={`e-${i}`} />;
                        const iso = d.toISOString().slice(0, 10);
                        const isPast = d < new Date(new Date().toDateString());
                        const isSelected = iso === selectedDate;
                        const hasAppt = bookedDates.has(iso);
                        return (
                          <button key={iso} disabled={isPast} onClick={() => setSelectedDate(iso)}
                            className={cn("h-7 w-7 mx-auto rounded-lg text-xs transition-colors",
                              isPast && "opacity-30 cursor-not-allowed",
                              isSelected && "bg-primary text-primary-foreground",
                              !isSelected && !isPast && "hover:bg-muted",
                              hasAppt && !isSelected && "border border-primary/40"
                            )}>
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && selectedDoctor && (
                  <div className="space-y-1.5">
                    <Label>Available Time Slots</Label>
                    {slots.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No available slots for this date.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map(s => {
                          const t = new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          return (
                            <button key={s} onClick={() => setSelectedSlot(s)}
                              className={cn("py-2 px-3 rounded-lg text-xs border transition-colors",
                                selectedSlot === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 hover:bg-muted"
                              )}>
                              <Clock className="h-3 w-3 inline mr-1" />{t}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Notes for Doctor (optional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe your reason for visit…" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setBookOpen(false)}>Cancel</Button>
                <Button onClick={handleBook} disabled={!selectedDoctor || !selectedSlot || booking} className="bg-gradient-primary">
                  {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Appointment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="upcoming">Upcoming ({appointments.filter(a => new Date(a.scheduled_at) >= now).length})</TabsTrigger>
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
            <p className="text-sm text-muted-foreground mt-1">Book your first appointment to get started.</p>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {filtered.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="relative">
                    <AppointmentCard appointment={a} perspective="patient" />
                    {a.status === "pending" || a.status === "confirmed" ? (
                      <button onClick={() => handleCancel(a.id)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}
