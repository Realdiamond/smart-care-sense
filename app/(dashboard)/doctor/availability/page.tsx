"use client";

import { useEffect, useState } from "react";
import { Clock, Save, Loader2, Check } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";


const supabase = createClient();
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface DayConfig { day_of_week: number; is_available: boolean; start_time: string; end_time: string; slot_minutes: number; }

const defaultDay = (d: number): DayConfig => ({ day_of_week: d, is_available: d >= 1 && d <= 5, start_time: "09:00", end_time: "17:00", slot_minutes: 30 });

export default function DoctorAvailability() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<DayConfig[]>(DAYS.map((_, i) => defaultDay(i)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Availability — KennyPulse"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("doctor_availability").select("*").eq("doctor_id", user.id);
      if (data && data.length > 0) {
        const map: Record<number, DayConfig> = {};
        data.forEach((r: any) => { map[r.day_of_week] = r; });
        setSchedule(DAYS.map((_, i) => map[i] ?? defaultDay(i)));
      }
      setLoading(false);
    })();
  }, [user]);

  const update = (day: number, key: keyof DayConfig, val: any) => {
    setSchedule(prev => prev.map(d => d.day_of_week === day ? { ...d, [key]: val } : d));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Upsert each day
      const rows = schedule.map(d => ({ ...d, doctor_id: user.id }));
      const { error } = await supabase.from("doctor_availability").upsert(rows, { onConflict: "doctor_id,day_of_week" });
      if (error) throw error;
      toast.success("Availability saved");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Availability</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Set your weekly schedule. Patients book from available slots.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Schedule
          </Button>
        </header>

        <div className="space-y-3">
          {schedule.map(day => (
            <Card key={day.day_of_week} className="p-4 border border-border/60 bg-card/40 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                {/* Day toggle */}
                <div className="flex items-center gap-3 w-36 shrink-0">
                  <Switch
                    id={`day-${day.day_of_week}`}
                    checked={day.is_available}
                    onCheckedChange={v => update(day.day_of_week, "is_available", v)}
                  />
                  <Label htmlFor={`day-${day.day_of_week}`} className={day.is_available ? "font-medium" : "text-muted-foreground"}>
                    {DAYS[day.day_of_week].slice(0, 3)}
                  </Label>
                </div>

                {day.is_available ? (
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Input type="time" value={day.start_time} onChange={e => update(day.day_of_week, "start_time", e.target.value)} className="w-32 text-sm" />
                      <span className="text-muted-foreground text-sm">→</span>
                      <Input type="time" value={day.end_time}   onChange={e => update(day.day_of_week, "end_time",   e.target.value)} className="w-32 text-sm" />
                    </div>
                    <Select value={String(day.slot_minutes)} onValueChange={v => update(day.day_of_week, "slot_minutes", parseInt(v))}>
                      <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min slots</SelectItem>
                        <SelectItem value="20">20 min slots</SelectItem>
                        <SelectItem value="30">30 min slots</SelectItem>
                        <SelectItem value="45">45 min slots</SelectItem>
                        <SelectItem value="60">60 min slots</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unavailable</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
