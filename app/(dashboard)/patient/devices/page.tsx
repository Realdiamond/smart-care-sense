"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wifi, Plus, Trash2, Copy, Check, Loader2, Watch as WatchIcon, Smartphone, Download, HeartPulse } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { APK_DOWNLOAD_URL } from "@/lib/app-download";
import { toast } from "sonner";

const supabase = createClient();
type Device = {
  id: string;
  name: string;
  device_type: string;
  connection_type: string;
  is_active: boolean;
  last_seen_at: string | null;
  api_key_prefix: string | null;
  created_at: string;
};

const INGEST_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ingest-vitals`;

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "hp_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const STEPS = [
  { n: 1, title: "Install the Smart Care app", body: "Download and install the Android companion app on the phone paired with your Oraimo watch." },
  { n: 2, title: "Log in with this account", body: "Open the app and sign in with the same email and password you use here." },
  { n: 3, title: "Allow Health Connect", body: "Grant the app permission to read your health data from Android Health Connect." },
  { n: 4, title: "Enable Oraimo → Health Connect", body: "In the Oraimo Health app, turn on syncing to Health Connect, then wear your watch. Vitals appear here within a few minutes." },
];

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Wi-Fi / IoT dialog
  const [wifiOpen, setWifiOpen] = useState(false);
  const [wifiName, setWifiName] = useState("");
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { document.title = "Connect your watch — HealthPulse"; }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("devices")
      .select("id, name, device_type, connection_type, is_active, last_seen_at, api_key_prefix, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDevices((data ?? []) as Device[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("devices-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleCreateWifi = async () => {
    if (!user || !wifiName.trim()) return;
    setCreating(true);
    try {
      const key = generateKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 10);
      const { error } = await supabase.from("devices").insert({
        user_id: user.id,
        name: wifiName.trim(),
        device_type: "iot",
        connection_type: "wifi",
        is_active: true,
        api_key_hash: hash,
        api_key_prefix: prefix,
      });
      if (error) throw error;
      setIssuedKey(key);
      setWifiName("");
      toast.success("Device created. Copy the key now — it will not be shown again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setCreating(false);
    }
  };

  const closeWifiDialog = () => {
    setWifiOpen(false);
    setIssuedKey(null);
    setCopied(false);
    setWifiName("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Device removed");
  };

  const copyKey = async () => {
    if (!issuedKey) return;
    await navigator.clipboard.writeText(issuedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const curlExample = useMemo(() => {
    const k = issuedKey ?? "<YOUR_DEVICE_KEY>";
    return `curl -X POST '${INGEST_URL}' \\
  -H 'content-type: application/json' \\
  -H 'x-device-key: ${k}' \\
  -d '{"metric_type":"heart_rate","value":74,"unit":"bpm"}'`;
  }, [issuedKey]);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Connect your watch</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your Oraimo watch syncs through the Smart Care Android app — install it, log in, and your vitals flow here automatically.
          </p>
        </header>

        {/* Connect via app */}
        <Card className="glass-card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-lg">Smart Care — Android app</div>
              <div className="text-sm text-muted-foreground">Reads your watch data from Health Connect and syncs it to your account.</div>
            </div>
            <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <a href={APK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download app
              </a>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-3 p-3 rounded-xl border border-border bg-card/30">
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center shrink-0">{s.n}</div>
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Advanced: IoT / Wi-Fi device */}
        <Card className="glass-card p-5 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-accent/15 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="font-medium">Advanced — IoT / Wi-Fi device</div>
                <div className="text-xs text-muted-foreground">For ESP32-style hardware that posts vitals over HTTP · per-device API key</div>
              </div>
            </div>

            <Dialog open={wifiOpen} onOpenChange={(o) => (o ? setWifiOpen(true) : closeWifiDialog())}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Register device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{issuedKey ? "Device key issued" : "Register IoT device"}</DialogTitle>
                </DialogHeader>

                {!issuedKey ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dname">Device name</Label>
                      <Input id="dname" placeholder="e.g. Living Room ESP32" value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll generate a one-time API key for your device. Store it securely on the device firmware — we only keep the hash.
                    </p>
                    <DialogFooter>
                      <Button variant="ghost" onClick={closeWifiDialog}>Cancel</Button>
                      <Button onClick={handleCreateWifi} disabled={!wifiName.trim() || creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate key"}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">API key (shown once)</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-md bg-muted/50 text-xs break-all">{issuedKey}</code>
                        <Button size="icon" variant="outline" onClick={copyKey} aria-label="Copy">
                          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Send a reading</Label>
                      <pre className="mt-1 p-3 rounded-md bg-muted/50 text-[11px] overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                    </div>
                    <DialogFooter>
                      <Button onClick={closeWifiDialog}>Done</Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Device list */}
        <Card className="glass-card p-5">
          <h2 className="text-lg font-medium mb-4">Your connected sources</h2>
          <div className="space-y-2">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : devices.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <WatchIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nothing connected yet. Install the app above and log in to start syncing.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-accent/15 text-accent">
                    {d.connection_type === "wifi" ? <Wifi className="h-4 w-4" /> : <HeartPulse className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="capitalize">{d.connection_type}</span>
                      {d.api_key_prefix && <span className="font-mono">· {d.api_key_prefix}…</span>}
                      {d.last_seen_at && <span>· seen {new Date(d.last_seen_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={d.is_active ? "border-success/40 text-success" : ""}>
                    {d.is_active ? "active" : "inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} aria-label="Delete device">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </AppShell>
  );
};

export default Devices;
