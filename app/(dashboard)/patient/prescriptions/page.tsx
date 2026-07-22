"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Pill, Clock, Calendar, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { getPatientPrescriptions } from "@/services/prescriptionService";
import type { Prescription } from "@/services/prescriptionService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "all">("active");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { document.title = "Prescriptions — KennyPulse"; }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPatientPrescriptions(user.id);
      setPrescriptions(data);
    } catch { toast.error("Failed to load prescriptions"); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = prescriptions.filter(p => tab === "active" ? p.is_active : true);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <span className="text-gradient-primary">Prescriptions</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Medications prescribed by your doctor.</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Card className="glass-card p-4 border-success/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-success/15 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <div className="text-xl font-semibold">{prescriptions.filter(p => p.is_active).length}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active</div>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4 border-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted/30 flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xl font-semibold">{prescriptions.length}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</div>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All Prescriptions</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <Pill className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No {tab === "active" ? "active " : ""}prescriptions</p>
            <p className="text-sm text-muted-foreground mt-1">Your doctor will issue prescriptions after your appointment.</p>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {filtered.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className={cn("p-0 overflow-hidden border bg-card/40 backdrop-blur-sm", p.is_active ? "border-success/20" : "border-border/40 opacity-70")}>
                    <button className="w-full text-left px-4 py-4 flex items-start gap-4" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", p.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{p.medication}</span>
                          <Badge variant="outline" className={cn("text-[10px]", p.is_active ? "border-success/40 text-success" : "text-muted-foreground")}>
                            {p.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {p.refills > 0 && <Badge variant="secondary" className="text-[10px]">{p.refills} refills</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.dosage} · {p.frequency}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">Dr. {p.doctor_name}</p>
                      </div>
                      <div className="shrink-0 text-muted-foreground">
                        {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expanded === p.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="border-t border-border/40 px-4 py-4 bg-muted/20 space-y-3 overflow-hidden">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Start Date</p>
                              <p className="mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.start_date).toLocaleDateString()}</p>
                            </div>
                            {p.end_date && (
                              <div>
                                <p className="text-muted-foreground uppercase tracking-wider text-[10px]">End Date</p>
                                <p className="mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.end_date).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                          {p.instructions && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Instructions</p>
                              <p className="text-xs mt-1 leading-relaxed">{p.instructions}</p>
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />Issued {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
