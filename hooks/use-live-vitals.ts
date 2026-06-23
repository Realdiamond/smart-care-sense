"use client";

// Reads REAL vitals from the `vitals_readings` table (populated by the
// Smart Care Bridge app from Health Connect / Oraimo) — no simulation.
// Seeds from the latest rows, then live-updates via Supabase Realtime INSERTs.
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { METRICS, MetricType } from "@/lib/vitals";

const supabase = createClient();
const HISTORY = 24;

export type LiveVitals = {
  values: Record<string, number>;
  secondary: Record<string, number>; // e.g. blood_pressure diastolic
  history: Record<string, { v: number }[]>;
  lastAt: Record<string, string>;
  hasData: boolean;
  latestReadingAt: string | null;
};

type Row = {
  metric_type: string;
  value: number;
  value_secondary: number | null;
  recorded_at: string;
};

export function useLiveVitals(userId: string | undefined): LiveVitals {
  const metricKeys = useMemo(
    () => Object.keys(METRICS).filter((k) => k !== "ecg") as MetricType[],
    [],
  );

  const [values, setValues] = useState<Record<string, number>>({});
  const [secondary, setSecondary] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Record<string, { v: number }[]>>({});
  const [lastAt, setLastAt] = useState<Record<string, string>>({});
  const [latestReadingAt, setLatestReadingAt] = useState<string | null>(null);
  const seeded = useRef(false);

  function apply(row: Row) {
    // Postgres `numeric` comes back as a string ("79"), so coerce to Number.
    const value = Number(row.value);
    if (!Number.isFinite(value)) return;
    const secondaryNum =
      row.value_secondary != null ? Number(row.value_secondary) : null;

    setValues((p) => ({ ...p, [row.metric_type]: value }));
    if (secondaryNum != null && Number.isFinite(secondaryNum)) {
      setSecondary((p) => ({ ...p, [row.metric_type]: secondaryNum }));
    }
    setLastAt((p) => ({ ...p, [row.metric_type]: row.recorded_at }));
    setLatestReadingAt((p) => (!p || row.recorded_at > p ? row.recorded_at : p));
    setHistory((p) => {
      const arr = (p[row.metric_type] ?? []).slice(-(HISTORY - 1));
      arr.push({ v: value });
      return { ...p, [row.metric_type]: arr };
    });
  }

  // Seed: latest ~200 readings, oldest-first so history fills correctly.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vitals_readings")
        .select("metric_type, value, value_secondary, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (cancelled || !data) return;
      seeded.current = true;
      for (const row of (data as Row[]).slice().reverse()) apply(row);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Live: subscribe to new INSERTs for this patient.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`vitals:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_readings", filter: `user_id=eq.${userId}` },
        (payload: { new: Row }) => apply(payload.new),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const hasData = Object.keys(values).length > 0;
  return { values, secondary, history, lastAt, hasData, latestReadingAt };
}
