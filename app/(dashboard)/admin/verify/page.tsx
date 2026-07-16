"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, ShieldAlert, CheckCircle2, XCircle, Loader2, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";


const supabase = createClient();
interface PendingDoctor {
  user_id: string;
  specialty: string;
  license_number: string;
  years_experience: number;
  hospital_affiliation: string | null;
  bio: string | null;
  full_name: string | null;
  created_at: string;
}

export default function DoctorVerification() {
  const [pending, setPending] = useState<PendingDoctor[]>([]);
  const [verified, setVerified] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => { document.title = "Doctor Verification — HealthPulse"; }, []);

  const load = async () => {
    setLoading(true);

    // Fetch doctor_profiles and profiles separately to avoid FK join issues
    const { data: dpData, error: dpError } = await supabase
      .from("doctor_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (dpError) {
      console.error("Failed to load doctor_profiles:", dpError.message);
      setLoading(false);
      return;
    }

    const userIds = (dpData ?? []).map((d: any) => d.user_id);
    const { data: profilesData } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };

    const profilesMap: Record<string, string | null> = {};
    (profilesData ?? []).forEach((p: any) => { profilesMap[p.id] = p.full_name; });

    const all = (dpData ?? []).map((r: any) => ({ ...r, full_name: profilesMap[r.user_id] ?? null }));
    setPending(all.filter((d: any) => !d.is_verified));
    setVerified(all.filter((d: any) => d.is_verified));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (userId: string) => {
    const { error } = await supabase.from("doctor_profiles").update({ is_verified: true }).eq("user_id", userId);
    if (error) { toast.error("Failed to approve"); return; }
    // Create notification for the doctor
    await supabase.from("notifications").insert({
      user_id: userId, type: "system", title: "Account Verified ✓",
      body: "Your doctor account has been verified by an administrator. You can now access your full dashboard.",
    });
    toast.success("Doctor verified successfully");
    load();
  };

  const reject = async (userId: string) => {
    const { error } = await supabase.from("user_roles").update({ role: "patient" as any }).eq("user_id", userId);
    if (error) { toast.error("Failed to reject"); return; }
    await supabase.from("notifications").insert({
      user_id: userId, type: "system", title: "Verification Update",
      body: notes[userId] ? `Your doctor verification was not approved: ${notes[userId]}` : "Your doctor verification could not be approved at this time. Please contact the administrator.",
    });
    toast.success("Doctor rejected and reverted to patient role");
    load();
  };

  const DoctorCard = ({ d, showActions }: { d: PendingDoctor; showActions: boolean }) => (
    <Card className={`p-5 border ${showActions ? "border-warning/30 bg-warning/5" : "border-success/20 bg-card/40"}`}>
      <div className="flex items-start gap-4">
        <UserAvatar name={d.full_name} role="doctor" size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">Dr. {d.full_name ?? "Unknown"}</span>
            {!showActions && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Verified</Badge>}
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {[
              { label: "Specialty", value: d.specialty },
              { label: "License",   value: d.license_number },
              { label: "Experience", value: `${d.years_experience} year${d.years_experience !== 1 ? "s" : ""}` },
              { label: "Hospital",  value: d.hospital_affiliation ?? "—" },
            ].map(f => (
              <div key={f.label}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}: </span>
                <span className="text-xs">{f.value}</span>
              </div>
            ))}
          </div>
          {d.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{d.bio}</p>}
        </div>
      </div>
      {showActions && (
        <div className="mt-4 space-y-2">
          <Textarea placeholder="Rejection reason (optional)…" rows={1} className="text-xs bg-background/40 min-h-[36px]"
            value={notes[d.user_id] ?? ""}
            onChange={e => setNotes(prev => ({ ...prev, [d.user_id]: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => approve(d.user_id)} className="bg-gradient-primary flex-1">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => reject(d.user_id)} className="border-destructive/40 text-destructive hover:bg-destructive/10 flex-1">
              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
            </Button>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /><span className="text-gradient-primary">Doctor Verification</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve doctor accounts before they can see patients.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <h2 className="font-semibold">Pending Verification ({pending.length})</h2>
              </div>
              {pending.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground bg-card/40">All doctor accounts are verified ✓</Card>
              ) : (
                <div className="space-y-4">
                  {pending.map((d, i) => (
                    <motion.div key={d.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <DoctorCard d={d} showActions={true} />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {verified.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <h2 className="font-semibold">Verified Doctors ({verified.length})</h2>
                </div>
                <div className="space-y-3">
                  {verified.map(d => <DoctorCard key={d.user_id} d={d} showActions={false} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
