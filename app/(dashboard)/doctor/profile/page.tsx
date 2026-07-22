"use client";

import { useEffect, useState } from "react";
import { Stethoscope, Save, Loader2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";


const supabase = createClient();
const SPECIALTIES = ["General Practice","Cardiology","Neurology","Oncology","Pediatrics","Orthopedics","Dermatology","Psychiatry","Radiology","Emergency Medicine","Internal Medicine","Endocrinology","Gastroenterology","Nephrology","Pulmonology","Rheumatology","Urology","Ophthalmology","ENT","Obstetrics & Gynecology"];

export default function DoctorProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [docProfile, setDocProfile] = useState({ specialty: "", license_number: "", years_experience: 0, bio: "", hospital_affiliation: "", is_accepting_patients: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "My Profile — KennyPulse"; }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("doctor_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setDocProfile({ specialty: data.specialty, license_number: data.license_number, years_experience: data.years_experience, bio: data.bio ?? "", hospital_affiliation: data.hospital_affiliation ?? "", is_accepting_patients: data.is_accepting_patients });
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("doctor_profiles").upsert({ user_id: user.id, ...docProfile, updated_at: new Date().toISOString() });
    if (error) toast.error("Failed to save"); else { toast.success("Profile saved"); refreshProfile(); }
    setSaving(false);
  };

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">My Profile</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Professional information visible to patients and administrators.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save
          </Button>
        </header>

        <Card className="glass-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar name={profile?.full_name} role="doctor" size="xl" />
            <div>
              <p className="text-lg font-semibold">Dr. {profile?.full_name ?? user?.email}</p>
              <p className="text-sm text-muted-foreground">{docProfile.specialty}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Specialty</Label>
                <Select value={docProfile.specialty} onValueChange={v => setDocProfile(p => ({ ...p, specialty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                  <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>License Number</Label>
                <Input value={docProfile.license_number} onChange={e => setDocProfile(p => ({ ...p, license_number: e.target.value }))} placeholder="MD-12345678" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Years of Experience</Label>
                <Input type="number" min={0} max={60} value={docProfile.years_experience} onChange={e => setDocProfile(p => ({ ...p, years_experience: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hospital Affiliation</Label>
                <Input value={docProfile.hospital_affiliation} onChange={e => setDocProfile(p => ({ ...p, hospital_affiliation: e.target.value }))} placeholder="General Hospital" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Professional Bio</Label>
              <Textarea value={docProfile.bio} onChange={e => setDocProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Brief professional background…" rows={4} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
              <div>
                <p className="text-sm font-medium">Accepting New Patients</p>
                <p className="text-xs text-muted-foreground">Toggle whether you're available for new patient assignments.</p>
              </div>
              <Switch checked={docProfile.is_accepting_patients} onCheckedChange={v => setDocProfile(p => ({ ...p, is_accepting_patients: v }))} />
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
