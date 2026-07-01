import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Activity, Brain, Watch, Stethoscope, Download, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Root: logged-in users go to their dashboard; everyone else sees the landing.
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleData?.role ?? "patient";
    if (role === "admin") redirect("/admin");
    if (role === "doctor") redirect("/doctor");
    redirect("/patient");
  }

  return <Landing />;
}

const FEATURES = [
  { icon: Activity, title: "Live vitals", body: "Heart rate, blood oxygen, blood pressure and steps — streamed from your watch to one clean dashboard." },
  { icon: Brain, title: "AI health insights", body: "Personalised, plain-language guidance based on your real trends." },
  { icon: Stethoscope, title: "Your care team", body: "Message doctors, book appointments and manage prescriptions in one place." },
  { icon: Watch, title: "Oraimo watch sync", body: "Install the companion app and your watch's data flows in automatically." },
];

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-vital flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-vital-foreground" />
          </div>
          <span className="text-lg font-semibold text-gradient-primary">HealthPulse</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/auth?mode=login" className="text-sm px-4 py-2 rounded-lg hover:bg-secondary transition-colors">Log in</Link>
          <Link href="/auth?mode=register" className="text-sm px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground hover:opacity-90">Register</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-5">
          <Watch className="h-4 w-4" /> Clinical-grade health monitoring
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-[1.05]">
          Your vitals, your care team, <span className="text-gradient-primary">in real time.</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mt-6 max-w-xl mx-auto">
          HealthPulse turns your Oraimo watch into a continuous health monitor — tracked, understood, and shared with the people who care for you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-9">
          <Link href="/auth" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90">
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/download" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium hover:bg-secondary transition-colors">
            <Download className="h-4 w-4" /> Get the Android app
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card p-6 rounded-2xl">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-medium">{f.title}</div>
            <div className="text-sm text-muted-foreground mt-1.5">{f.body}</div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} HealthPulse · Smart Care Sense</span>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="hover:text-foreground">Log in</Link>
            <Link href="/download" className="hover:text-foreground">Download app</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
