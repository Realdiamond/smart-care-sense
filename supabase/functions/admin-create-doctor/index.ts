import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate caller is an admin (check JWT claim from calling client)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized: No token provided" }), { status: 200, headers: corsHeaders });

    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller using the JWT — getUser validates the token server-side
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !caller) {
      console.error("getUser error:", callerError);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), { status: 200, headers: corsHeaders });
    }

    const { data: callerRole } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (callerRole?.role !== "admin") return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), { status: 200, headers: corsHeaders });

    // ── Parse request ──────────────────────────────────────
    const { full_name, email, password, specialty, license_number, years_experience } = await req.json();

    if (!full_name || !email || !password || !license_number) {
      return new Response(JSON.stringify({ error: "full_name, email, password, and license_number are required" }), { status: 400, headers: corsHeaders });
    }

    // ── Create the auth user ───────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation for admin-created accounts
      user_metadata: { full_name },
    });

    if (authError) throw authError;
    const newUserId = authData.user.id;

    // ── The trigger auto-creates user_roles (patient) and profile
    //    Update role to 'doctor' ────────────────────────────
    await supabase.from("user_roles").update({ role: "doctor" }).eq("user_id", newUserId);

    // ── Update profile full_name (trigger may not set it) ──
    await supabase.from("profiles").upsert({
      id: newUserId,
      full_name,
      updated_at: new Date().toISOString(),
    });

    // ── Create doctor_profile ──────────────────────────────
    const { error: dpError } = await supabase.from("doctor_profiles").insert({
      user_id:          newUserId,
      specialty:        specialty ?? "General Practice",
      license_number,
      years_experience: years_experience ?? 0,
      is_verified:      false, // Admin must separately verify
      is_accepting_patients: true,
    });

    if (dpError) {
      // Rollback: delete auth user if profile creation failed
      await supabase.auth.admin.deleteUser(newUserId);
      throw dpError;
    }

    // ── Notify the new doctor ──────────────────────────────
    await supabase.from("notifications").insert({
      user_id: newUserId,
      type: "system",
      title: "Welcome to KennyPulse! 👋",
      body: `Your doctor account has been created by an administrator. Your account is pending verification. Once verified, you'll have full access to your dashboard.`,
    });

    // ── Notify admins (so they can verify) ────────────────
    const { data: adminIds } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (adminIds && adminIds.length > 0) {
      await supabase.from("notifications").insert(
        adminIds.map((a: any) => ({
          user_id: a.user_id,
          type: "doctor_assigned",
          title: "New Doctor Account Created",
          body: `Dr. ${full_name} (${specialty}) account has been created and is pending verification.`,
          action_url: "/admin/verify",
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, message: `Successfully created doctor account for ${email}`, user_id: newUserId, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("admin-create-doctor error:", err);
    // Returning 200 so the frontend can actually parse the JSON body instead of throwing a generic error
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
