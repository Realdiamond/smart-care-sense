"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, Bell, Shield, Database, Mail } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type SystemSettings = {
  platform_name: string;
  allow_patient_signup: boolean;
  require_doctor_verification: boolean;
  auto_weekly_reports: boolean;
  emergency_alert_threshold_hr_high: number;
  emergency_alert_threshold_hr_low: number;
  emergency_alert_threshold_spo2: number;
  report_frequency_days: number;
  max_patients_per_doctor: number;
  maintenance_mode: boolean;
};

const DEFAULTS: SystemSettings = {
  platform_name: "KennyPulse",
  allow_patient_signup: true,
  require_doctor_verification: true,
  auto_weekly_reports: true,
  emergency_alert_threshold_hr_high: 120,
  emergency_alert_threshold_hr_low: 45,
  emergency_alert_threshold_spo2: 92,
  report_frequency_days: 7,
  max_patients_per_doctor: 50,
  maintenance_mode: false,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load from DB on mount ──────────────────────────────────
  useEffect(() => {
    document.title = "System Settings — KennyPulse";

    supabase
      .from("system_settings")
      .select("*")
      .single()
      .then(({ data, error }: { data: SystemSettings | null; error: any }) => {
        if (error) {
          toast.error("Could not load settings: " + error.message);
        } else if (data) {
          setSettings({
            platform_name: data.platform_name,
            allow_patient_signup: data.allow_patient_signup,
            require_doctor_verification: data.require_doctor_verification,
            auto_weekly_reports: data.auto_weekly_reports,
            emergency_alert_threshold_hr_high: data.emergency_alert_threshold_hr_high,
            emergency_alert_threshold_hr_low: data.emergency_alert_threshold_hr_low,
            emergency_alert_threshold_spo2: data.emergency_alert_threshold_spo2,
            report_frequency_days: data.report_frequency_days,
            max_patients_per_doctor: data.max_patients_per_doctor,
            maintenance_mode: data.maintenance_mode,
          });
        }
        setLoading(false);
      });
  }, []);

  // ── Save to DB ─────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Settings saved to database ✓");
    }
    setSaving(false);
  };

  const set = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  // ── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">System Settings</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Global platform configuration — persisted to database.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Changes</>
            )}
          </Button>
        </header>

        {/* General */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" /><h2 className="font-semibold">General</h2>
          </div>
          <div className="space-y-1.5">
            <Label>Platform Name</Label>
            <Input value={settings.platform_name} onChange={(e) => set("platform_name", e.target.value)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Allow Patient Self-Registration</p>
              <p className="text-xs text-muted-foreground">New users can sign up as patients.</p>
            </div>
            <Switch checked={settings.allow_patient_signup} onCheckedChange={(v) => set("allow_patient_signup", v)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Require Doctor Verification</p>
              <p className="text-xs text-muted-foreground">New doctor accounts must be approved by admin.</p>
            </div>
            <Switch checked={settings.require_doctor_verification} onCheckedChange={(v) => set("require_doctor_verification", v)} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border/40 pt-4">
            <div>
              <p className="text-sm font-medium text-warning">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Disable platform access for non-admins.</p>
            </div>
            <Switch checked={settings.maintenance_mode} onCheckedChange={(v) => set("maintenance_mode", v)} />
          </div>
        </Card>

        {/* Emergency Alert Thresholds */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-destructive" /><h2 className="font-semibold">Emergency Alert Thresholds</h2>
          </div>
          <p className="text-xs text-muted-foreground">Vitals outside these ranges trigger emergency notifications to the assigned doctor.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Heart Rate Max (bpm)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_hr_high}
                onChange={(e) => set("emergency_alert_threshold_hr_high", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heart Rate Min (bpm)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_hr_low}
                onChange={(e) => set("emergency_alert_threshold_hr_low", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>SpO₂ Min (%)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_spo2}
                onChange={(e) => set("emergency_alert_threshold_spo2", parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </Card>

        {/* Reports & Limits */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-accent" /><h2 className="font-semibold">Reports &amp; Limits</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Automatic Weekly Reports</p>
              <p className="text-xs text-muted-foreground">Scheduled via pg_cron every 7 days.</p>
            </div>
            <Switch checked={settings.auto_weekly_reports} onCheckedChange={(v) => set("auto_weekly_reports", v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Report Frequency (days)</Label>
              <Input type="number" value={settings.report_frequency_days}
                onChange={(e) => set("report_frequency_days", parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Patients per Doctor</Label>
              <Input type="number" value={settings.max_patients_per_doctor}
                onChange={(e) => set("max_patients_per_doctor", parseInt(e.target.value) || 1)} />
            </div>
          </div>
        </Card>

        {/* Email (Resend) — CLI secret, display only */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" /><h2 className="font-semibold">Email Notifications (Resend)</h2>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
            <p className="font-medium">Setup Instructions:</p>
            <p className="text-muted-foreground">1. Sign up free at <strong>resend.com</strong> (3,000 emails/month free)</p>
            <p className="text-muted-foreground">2. Create an API key</p>
            <p className="text-muted-foreground">3. Run: <code className="bg-muted px-1 rounded">supabase secrets set RESEND_API_KEY=re_xxx</code></p>
            <p className="text-muted-foreground">4. Weekly reports and emergency alerts will automatically use it.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
