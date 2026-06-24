import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are HealthPulse Assistant, a warm, careful, evidence-aware health companion.

RULES:
- Use the provided KNOWLEDGE BASE snippets as your primary source. Cite them inline like [1], [2] when you use them.
- Use the user's RECENT VITALS when relevant; reference values with units and dates.
- You are NOT a doctor. Never diagnose. Encourage professional care for anything concerning, and call out emergency warning signs explicitly.
- Be concise, structured (short paragraphs / bullet points), and use markdown.
- If the user asks something outside health/wellness, gently redirect.
- If you lack information, say so plainly instead of inventing facts.`;

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
}

function scoreDoc(query: string, doc: { title: string; content: string; tags: string[] | null }) {
  const q = new Set(tokenize(query));
  const text = `${doc.title} ${doc.content} ${(doc.tags ?? []).join(" ")}`.toLowerCase();
  let score = 0;
  for (const term of q) {
    if (!term) continue;
    const matches = text.split(term).length - 1;
    score += matches;
    if (doc.title.toLowerCase().includes(term)) score += 2;
    if ((doc.tags ?? []).some((t) => t.toLowerCase().includes(term))) score += 1.5;
  }
  return score;
}

function formatVital(v: any): string {
  const when = new Date(v.recorded_at).toLocaleString();
  const sec = v.value_secondary != null ? `/${v.value_secondary}` : "";
  return `- ${v.metric_type}: ${v.value}${sec} ${v.unit} (${when})`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    // --- RETRIEVAL: knowledge base (lexical scoring) ---
    const { data: knowledge } = await supabase
      .from("health_knowledge")
      .select("id,title,content,category,tags");

    const ranked = (knowledge ?? [])
      .map((d) => ({ doc: d, score: scoreDoc(lastUser, d) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.doc);

    const knowledgeBlock = ranked.length
      ? ranked.map((d, i) => `[${i + 1}] ${d.title} (${d.category})\n${d.content}`).join("\n\n")
      : "(no relevant guidelines found)";

    // --- RETRIEVAL: recent vitals (last 10) ---
    const { data: vitals } = await supabase
      .from("vitals_readings")
      .select("metric_type,value,value_secondary,unit,recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(10);

    const vitalsBlock = vitals && vitals.length
      ? vitals.map(formatVital).join("\n")
      : "(no recent vitals recorded)";

    // --- RETRIEVAL: profile ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,date_of_birth,sex,height_cm,weight_kg,blood_type,medical_conditions,medications,allergies")
      .eq("id", userId)
      .maybeSingle();

    const profileBlock = profile
      ? `Name: ${profile.full_name ?? "—"}\nDOB: ${profile.date_of_birth ?? "—"} | Sex: ${profile.sex ?? "—"}\nHeight: ${profile.height_cm ?? "—"} cm | Weight: ${profile.weight_kg ?? "—"} kg | Blood: ${profile.blood_type ?? "—"}\nConditions: ${(profile.medical_conditions ?? []).join(", ") || "—"}\nMedications: ${(profile.medications ?? []).join(", ") || "—"}\nAllergies: ${(profile.allergies ?? []).join(", ") || "—"}`
      : "(no profile on file)";

    const contextMessage = {
      role: "system" as const,
      content: `KNOWLEDGE BASE (cite as [n]):\n${knowledgeBlock}\n\nUSER PROFILE:\n${profileBlock}\n\nRECENT VITALS:\n${vitalsBlock}`,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          contextMessage,
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Sources": encodeURIComponent(JSON.stringify(ranked.map((d) => ({ id: d.id, title: d.title, category: d.category })))),
      },
    });
  } catch (e) {
    console.error("chat-rag error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});