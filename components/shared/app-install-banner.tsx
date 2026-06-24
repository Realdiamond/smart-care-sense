"use client";

import { useEffect, useState } from "react";
import { Smartphone, Download, X } from "lucide-react";
import { APK_DOWNLOAD_URL } from "@/lib/app-download";

const DISMISS_KEY = "app_banner_dismissed";

// Top banner nudging patients to install the Android app needed to sync the
// watch. Dismissible (remembered in localStorage).
export function AppInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3">
      <Smartphone className="h-5 w-5 text-primary shrink-0" />
      <p className="text-sm flex-1 min-w-0">
        <span className="font-medium">Install the Smart Care app</span>
        <span className="text-muted-foreground"> — required to sync your watch vitals to this dashboard.</span>
      </p>
      <a
        href={APK_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary text-primary-foreground text-sm px-3 py-1.5 hover:opacity-90 shrink-0"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </a>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
