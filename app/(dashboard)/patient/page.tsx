"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Wifi, Bluetooth, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/dashboard/app-shell";
import { VitalCard } from "@/components/dashboard/vital-card";
import { METRICS, MetricType } from "@/lib/vitals";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useLiveVitals } from "@/hooks/use-live-vitals";

const supabase = createClient();

const Dashboard = () => {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.full_name) setProfileName(data.full_name.split(" ")[0]);
      });
  }, [user]);

  const metricKeys = useMemo(
    () => Object.keys(METRICS).filter((k) => k !== "ecg") as MetricType[],
    []
  );

  // REAL vitals streamed from Health Connect via the Smart Care Bridge.
  const { values, secondary, history, hasData, latestReadingAt } = useLiveVitals(user?.id);

  return (
    <AppShell>
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">
            Hello{profileName ? `, ${profileName}` : ""}.{" "}
            <span className="text-gradient-primary">
              {hasData ? "Your latest vitals." : "Waiting for your watch."}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasData ? (
            <Badge className="bg-success/15 text-success border-0 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live · {latestReadingAt ? new Date(latestReadingAt).toLocaleTimeString() : ""}
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground border-0 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              No data yet
            </Badge>
          )}
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/patient/devices"><Bluetooth className="h-3.5 w-3.5" /> Connect device</Link>
          </Button>
        </div>
      </header>

      {/* AI insight strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-primary mb-1">AI Insight</div>
            <p className="text-sm text-foreground/90">
              Your resting heart rate is trending <span className="text-success font-medium">2 bpm lower</span> than last week — a sign of improving cardiovascular fitness. Keep up the consistent activity.
            </p>
          </div>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link href="/patient/assistant">Ask the assistant</Link>
          </Button>
        </Card>
      </motion.div>

      {/* Vitals grid */}
      <section aria-label="Live vitals" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metricKeys.map((k, i) => (
          <VitalCard
            key={k}
            meta={METRICS[k]}
            value={values[k]}
            secondary={k === "blood_pressure" ? secondary["blood_pressure"] : undefined}
            history={history[k] ?? []}
            index={i}
          />
        ))}
      </section>

      {/* Connectivity */}
      <section className="mt-6">
        <Card className="glass-card p-5 flex flex-col">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Connectivity</div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Bluetooth className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm">Web Bluetooth</div>
                  <div className="text-[11px] text-muted-foreground">GATT · BLE 5.0</div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-accent" />
                <div>
                  <div className="text-sm">Wi-Fi Ingest</div>
                  <div className="text-[11px] text-muted-foreground">HTTPS endpoint</div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-vital" />
                <div>
                  <div className="text-sm">Health Connect bridge</div>
                  <div className="text-[11px] text-muted-foreground">Oraimo · live readings</div>
                </div>
              </div>
              {hasData ? (
                <Badge className="bg-success/15 text-success border-0 text-[10px]">Active</Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Waiting</Badge>
              )}
            </div>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/patient/devices">Manage devices</Link>
          </Button>
        </Card>
      </section>
    </AppShell>
  );
};

export default Dashboard;
