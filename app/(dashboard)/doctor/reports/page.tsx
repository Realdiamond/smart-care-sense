"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3, Download, Calendar, HeartPulse, Loader2, FileText, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { METRICS, MetricType } from "@/lib/vitals";


const supabase = createClient();
interface Report {
  id: string;
  patient_id: string;
  patient_name?: string;
  report_week_start: string;
  report_data: any;
  summary_text: string | null;
  sent_to_doctor: boolean;
  generated_at: string;
}

function downloadReportPDF(report: Report) {
  // Build a printable HTML page and trigger browser print-to-PDF
  const data = report.report_data as Record<string, { avg: number; min: number; max: number; count: number; unit: string }>;
  const weekOf = new Date(report.report_week_start).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  const rows = Object.entries(data).map(([metric, v]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${METRICS[metric as MetricType]?.label ?? metric}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${v.avg?.toFixed(1) ?? "—"} ${v.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${v.min?.toFixed(1) ?? "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${v.max?.toFixed(1) ?? "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${v.count ?? 0}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html><head><title>Weekly Vital Report — ${report.patient_name ?? "Patient"}</title>
  <style>body{font-family:system-ui,sans-serif;padding:40px;color:#111}h1{font-size:24px;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:13px}
  td{font-size:13px}</style></head><body>
  <h1>HealthPulse — Weekly Vital Report</h1>
  <p><strong>Patient:</strong> ${report.patient_name ?? "—"}</p>
  <p><strong>Week of:</strong> ${weekOf}</p>
  <p><strong>Generated:</strong> ${new Date(report.generated_at).toLocaleString()}</p>
  ${report.summary_text ? `<p style="margin-top:16px;padding:12px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px">${report.summary_text}</p>` : ""}
  <table><thead><tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>Readings</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:24px;font-size:11px;color:#9ca3af">This report was generated automatically by HealthPulse. Not a substitute for professional clinical judgment.</p>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); win.print(); }
  else toast.error("Popup blocked — allow popups for this site");
}

export default function WeeklyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [filterPatient, setFilterPatient] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => { document.title = "Weekly Reports — HealthPulse"; }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: rData, error } = await supabase
      .from("weekly_vital_reports")
      .select("*")
      .eq("doctor_id", user.id)
      .order("report_week_start", { ascending: false })
      .limit(50);
    if (!error && rData) {
      const pids = [...new Set(rData.map((r: any) => r.patient_id))];
      const { data: profData } = pids.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", pids)
        : { data: [] };
      const pm: Record<string, string> = {};
      (profData ?? []).forEach((p: any) => { pm[p.id] = p.full_name ?? "Unknown"; });
      setReports(rData.map((r: any) => ({ ...r, patient_name: pm[r.patient_id] ?? "Unknown" })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: aData } = await supabase
        .from("doctor_patient_assignments")
        .select("patient_id")
        .eq("doctor_id", user.id);
      const pids = (aData ?? []).map((r: any) => r.patient_id);
      const { data: profData } = pids.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", pids)
        : { data: [] };
      const pm: Record<string, string> = {};
      (profData ?? []).forEach((p: any) => { pm[p.id] = p.full_name ?? "Patient"; });
      setPatients(pids.map((id: string) => ({ id, name: pm[id] ?? "Patient" })));
    })();
  }, [user]);

  const generateReport = async (patientId: string) => {
    setGenerating(patientId);
    try {
      const { error } = await supabase.functions.invoke("weekly-report", { body: { patient_id: patientId, doctor_id: user!.id } });
      if (error) throw error;
      toast.success("Report generated!");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Failed to generate report"); }
    setGenerating(null);
  };

  const filtered = filterPatient === "all" ? reports : reports.filter(r => r.patient_id === filterPatient);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Weekly Reports</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Auto-generated weekly vital summaries for your patients.</p>
          </div>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All patients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </header>

        {/* Manual generate */}
        <Card className="glass-card p-4">
          <p className="text-sm font-medium mb-3">Generate Report Manually</p>
          <div className="flex flex-wrap gap-2">
            {patients.map(p => (
              <Button key={p.id} variant="outline" size="sm" disabled={generating === p.id}
                onClick={() => generateReport(p.id)}>
                {generating === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                {p.name}
              </Button>
            ))}
            {patients.length === 0 && <p className="text-xs text-muted-foreground">No patients assigned.</p>}
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No reports yet</p>
            <p className="text-sm text-muted-foreground mt-1">Reports are generated weekly or manually above.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((r, i) => {
              const data = r.report_data as Record<string, any>;
              const anomalies = data?.__anomaly_count ?? 0;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-5 border border-border/60 bg-card/40 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Week of {new Date(r.report_week_start).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                          {anomalies > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-warning" />
                              <span className="text-xs text-warning">{anomalies} anomal{anomalies > 1 ? "ies" : "y"} detected</span>
                            </div>
                          )}
                          {r.summary_text && <p className="text-xs text-muted-foreground mt-1 max-w-md">{r.summary_text}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={r.sent_to_doctor ? "secondary" : "outline"} className="text-[10px]">
                          {r.sent_to_doctor ? "Sent" : "Local"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => downloadReportPDF(r)}>
                          <Download className="h-3.5 w-3.5 mr-1" />PDF
                        </Button>
                      </div>
                    </div>

                    {/* Mini metric summary */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {Object.entries(data).filter(([k]) => !k.startsWith("__")).slice(0, 8).map(([metric, v]: [string, any]) => {
                        const meta = METRICS[metric as MetricType];
                        return (
                          <div key={metric} className="rounded-lg bg-muted/30 px-3 py-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta?.label ?? metric}</p>
                            <p className="text-sm font-semibold mt-0.5">{v.avg?.toFixed(1) ?? "—"} <span className="text-[10px] font-normal text-muted-foreground">{v.unit}</span></p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
