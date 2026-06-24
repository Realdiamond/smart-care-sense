import type { Metadata } from "next";
import Link from "next/link";
import { Download, HeartPulse, Watch, ShieldCheck, Activity } from "lucide-react";
import { APK_DOWNLOAD_URL, LATEST_APP_VERSION } from "@/lib/app-download";

export const metadata: Metadata = {
  title: "Get the App — HealthPulse",
  description: "Download the Smart Care Android app to sync your Oraimo watch vitals to your HealthPulse dashboard.",
};

const STEPS = [
  { icon: Download, title: "Install the app", body: "Download the APK below and install it on the Android phone paired with your Oraimo watch." },
  { icon: ShieldCheck, title: "Log in & allow access", body: "Sign in with your HealthPulse account and grant Health Connect permission." },
  { icon: Activity, title: "Vitals sync automatically", body: "Wear your watch — heart rate, SpO₂, steps and more appear on your dashboard." },
];

export default function DownloadPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-full bg-gradient-vital flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-vital-foreground" />
          </div>
          <span className="text-lg font-semibold text-gradient-primary">HealthPulse</span>
        </div>

        {/* Hero */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-3">
          <Watch className="h-4 w-4" /> Android companion app
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Sync your Oraimo watch to <span className="text-gradient-primary">HealthPulse</span>.
        </h1>
        <p className="text-muted-foreground text-base mb-8 max-w-xl">
          The Smart Care app reads your watch&apos;s vitals from Android Health Connect and streams them to your care
          dashboard — heart rate, blood oxygen, steps and more.
        </p>

        {/* Download */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
          >
            <Download className="h-5 w-5" /> Download for Android
          </a>
          <span className="text-xs text-muted-foreground">Version {LATEST_APP_VERSION} · Android 8+ · requires Health Connect</span>
        </div>

        {/* Steps */}
        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          {STEPS.map((s) => (
            <div key={s.title} className="glass-card p-5 rounded-2xl">
              <s.icon className="h-6 w-6 text-primary mb-3" />
              <div className="font-medium text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          Already have the app?{" "}
          <Link href="/auth" className="text-primary hover:underline">Log in to your dashboard →</Link>
        </div>
      </div>
    </main>
  );
}
