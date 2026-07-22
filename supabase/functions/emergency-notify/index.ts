import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { patient_id, alert_id, metric_type, metric_value, message } = body;

    if (!patient_id || !message) {
      return new Response(JSON.stringify({ error: "patient_id and message required" }), { status: 400, headers: corsHeaders });
    }

    // ── Find the patient's assigned doctor ─────────────────
    const { data: assignment } = await supabase
      .from("doctor_patient_assignments")
      .select("doctor_id")
      .eq("patient_id", patient_id)
      .eq("is_primary", true)
      .maybeSingle();

    if (!assignment) {
      console.log("No doctor assigned for patient", patient_id);
      return new Response(JSON.stringify({ error: "No doctor assigned" }), { status: 404, headers: corsHeaders });
    }

    const doctor_id = assignment.doctor_id;

    // ── Create emergency_alert row ─────────────────────────
    const { data: emergencyAlert, error: alertError } = await supabase
      .from("emergency_alerts")
      .insert({
        patient_id,
        doctor_id,
        triggered_by_alert_id: alert_id ?? null,
        status: "triggered",
        metric_type:  metric_type  ?? null,
        metric_value: metric_value ?? null,
        message,
      })
      .select()
      .single();

    if (alertError) throw alertError;

    // ── Get patient name ───────────────────────────────────
    const { data: patProfile } = await supabase.from("profiles").select("full_name").eq("id", patient_id).maybeSingle();
    const patName = patProfile?.full_name ?? "A patient";

    // ── In-app notification for doctor ─────────────────────
    await supabase.from("notifications").insert({
      user_id: doctor_id,
      type: "emergency_alert",
      title: `🚨 Emergency Alert — ${patName}`,
      body: `${message}${metric_type ? ` (${metric_type.replace(/_/g," ")}: ${metric_value})` : ""}`,
      action_url: "/doctor/alerts",
      metadata: { emergency_alert_id: emergencyAlert.id, patient_id, metric_type, metric_value },
    });

    // ── Email via Resend (if configured) ───────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const { data: docUser } = await supabase.auth.admin.getUserById(doctor_id);
      const { data: docProfile } = await supabase.from("profiles").select("full_name").eq("id", doctor_id).maybeSingle();
      const doctorEmail = docUser?.user?.email;

      if (doctorEmail) {
        const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:600px">
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:8px;margin-bottom:24px">
            <h2 style="color:#dc2626;margin:0 0 8px">🚨 Emergency Patient Alert</h2>
            <p style="margin:0;font-size:14px">Immediate attention may be required.</p>
          </div>
          <p>Dear Dr. ${docProfile?.full_name ?? ""},</p>
          <p><strong>${patName}</strong> has triggered an emergency health alert on KennyPulse.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px">
            <tr><td style="padding:10px 16px;font-weight:600">Patient</td><td style="padding:10px 16px">${patName}</td></tr>
            <tr><td style="padding:10px 16px;font-weight:600">Alert</td><td style="padding:10px 16px">${message}</td></tr>
            ${metric_type ? `<tr><td style="padding:10px 16px;font-weight:600">Metric</td><td style="padding:10px 16px">${metric_type.replace(/_/g," ")}: <strong>${metric_value}</strong></td></tr>` : ""}
            <tr><td style="padding:10px 16px;font-weight:600">Time</td><td style="padding:10px 16px">${new Date().toLocaleString()}</td></tr>
          </table>
          <a href="${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co","")}/doctor/alerts" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Alert in KennyPulse</a>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">This is an automated emergency notification from KennyPulse. Do not reply to this email.</p>
          <p style="font-size:11px;color:#d1d5db">⚠️ This is not a substitute for emergency services. If the patient is in immediate danger, please call 999/911.</p>
        </body></html>`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from:    "KennyPulse Alerts <alerts@kennypulse.app>",
            to:      [doctorEmail],
            subject: `🚨 Emergency Alert — ${patName} needs attention`,
            html,
          }),
        });

        if (!emailRes.ok) {
          console.error("Resend email failed:", await emailRes.text());
        }
      }
    } else {
      console.log("RESEND_API_KEY not set — email notification skipped. In-app notification was sent.");
    }

    return new Response(JSON.stringify({ success: true, emergency_alert_id: emergencyAlert.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("emergency-notify error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
