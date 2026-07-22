"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Search, Plus, Shield, Stethoscope, User, Loader2, MoreHorizontal, Trash2, UserCheck, UserX } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const supabase = createClient();
interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  is_verified?: boolean;
}

const SPECIALTIES = ["General Practice","Cardiology","Neurology","Pediatrics","Orthopedics","Dermatology","Psychiatry","Internal Medicine","Emergency Medicine","Endocrinology","Gastroenterology","Pulmonology"];

export default function UserManagement() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Doctor creation form
  const [form, setForm] = useState({ full_name: "", email: "", password: "", specialty: "General Practice", license_number: "", years_experience: "0" });

  useEffect(() => { document.title = "User Management — KennyPulse"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    
    // Fetch roles and profiles separately and merge, since they don't have a direct FK relationship
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name")
    ]);

    if (!rolesRes.error && rolesRes.data) {
      const profilesMap: Record<string, string | null> = {};
      (profilesRes.data ?? []).forEach((p: any) => { profilesMap[p.id] = p.full_name; });


      // Also get verification status for doctors
      const doctorIds = rolesRes.data.filter((r: any) => r.role === "doctor").map((r: any) => r.user_id);
      const { data: dpData } = doctorIds.length > 0
        ? await supabase.from("doctor_profiles").select("user_id, is_verified").in("user_id", doctorIds)
        : { data: [] };
      const verMap: Record<string, boolean> = {};
      (dpData ?? []).forEach((d: any) => { verMap[d.user_id] = d.is_verified; });

      const rolesMap: Record<string, any> = {};
      (rolesRes.data ?? []).forEach((r: any) => { rolesMap[r.user_id] = r; });

      setUsers((profilesRes.data ?? []).map((p: any) => {
        const r = rolesMap[p.id];
        return {
          id: p.id,
          email: "",
          full_name: p.full_name,
          role: r?.role ?? "patient", // fallback
          created_at: r?.created_at ?? new Date().toISOString(),
          is_verified: r?.role === "doctor" ? verMap[p.id] ?? false : undefined,
        };
      }));
    } else {
      console.error("Failed to fetch users:", rolesRes.error || profilesRes.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateDoctor = async () => {
    if (!form.full_name || !form.email || !form.password || !form.license_number) {
      toast.error("All fields are required"); return;
    }
    setCreating(true);
    try {
      // Explicitly get the session token so the edge function can verify the caller is an admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You are not logged in. Please refresh the page and try again.");

      const { data, error } = await supabase.functions.invoke("admin-create-doctor", {
        body: { full_name: form.full_name, email: form.email, password: form.password, specialty: form.specialty, license_number: form.license_number, years_experience: parseInt(form.years_experience) || 0 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      
      // If the backend didn't set Content-Type: application/json, it might be returned as a Blob or ArrayBuffer
      let parsedData = data;
      if (data instanceof Blob) {
        const text = await data.text();
        try { parsedData = JSON.parse(text); } catch(e) { parsedData = { error: text }; }
      }
      
      if (parsedData && parsedData.error) throw new Error(parsedData.error);
      
      toast.success(parsedData.message);
      setCreateOpen(false);
      setForm({ full_name: "", email: "", password: "", specialty: "General Practice", license_number: "", years_experience: "0" });
      await load();
    } catch (e: any) { 
      console.error("❌ BACKEND ERROR:", e);
      toast.error(e.message); 
    }
    setCreating(false);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
    if (error) { toast.error("Failed to update role"); return; }

    // When promoting to doctor, ensure a doctor_profiles row exists
    // so they appear in the Verify Doctors queue
    if (newRole === "doctor") {
      await supabase.from("doctor_profiles").upsert({
        user_id: userId,
        specialty: "General Practice",
        license_number: "PENDING",
        years_experience: 0,
        is_verified: false,
        is_accepting_patients: false,
      }, { onConflict: "user_id" });
    }

    toast.success("Role updated");
    await load();
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { admin: "bg-violet-500/15 text-violet-400 border-violet-500/30", doctor: "bg-blue-500/15 text-blue-400 border-blue-500/30", patient: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    return map[role] ?? map.patient;
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search || (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    return matchRole && matchSearch;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /><span className="text-gradient-primary">User Management</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{users.length} total users on the platform</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow"><Plus className="h-4 w-4 mr-2" />Create Doctor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Doctor Account</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">Only Admins can create Doctor accounts. The doctor will receive their login credentials.</p>
                {[
                  { label: "Full Name",       key: "full_name",     placeholder: "Dr. Jane Smith",  type: "text" },
                  { label: "Email",           key: "email",         placeholder: "doctor@clinic.com", type: "email" },
                  { label: "Password",        key: "password",      placeholder: "Temporary password", type: "password" },
                  { label: "License Number",  key: "license_number", placeholder: "MD-12345678",    type: "text" },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Specialty</Label>
                    <Select value={form.specialty} onValueChange={v => setForm(p => ({ ...p, specialty: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Years Experience</Label>
                    <Input type="number" min="0" value={form.years_experience}
                      onChange={e => setForm(p => ({ ...p, years_experience: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateDoctor} disabled={creating} className="bg-gradient-primary">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Doctor"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="patient">Patients</SelectItem>
              <SelectItem value="doctor">Doctors</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-4 flex items-center gap-4 border border-border/60 bg-card/40 backdrop-blur-sm">
                  <UserAvatar name={u.full_name} role={u.role} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.full_name ?? "No name"}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", roleBadge(u.role))}>
                        {u.role}
                      </span>
                      {u.role === "doctor" && u.is_verified === false && (
                        <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Unverified</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <Select value={u.role} onValueChange={v => handleChangeRole(u.id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <Card className="p-10 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No users found
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
