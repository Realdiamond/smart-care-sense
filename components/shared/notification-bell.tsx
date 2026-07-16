"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X, Calendar, AlertTriangle, FileText, MessageCircle, HeartPulse, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment_booked:    Calendar,
  appointment_confirmed: Calendar,
  appointment_cancelled: Calendar,
  appointment_reminder:  Calendar,
  prescription_issued:   FileText,
  vital_alert:           HeartPulse,
  emergency_alert:       AlertTriangle,
  weekly_report:         FileText,
  doctor_message:        MessageCircle,
  patient_message:       MessageCircle,
  doctor_assigned:       CheckCheck,
  system:                Info,
};

const typeColor: Record<string, string> = {
  emergency_alert: "text-destructive bg-destructive/10",
  vital_alert:     "text-vital bg-vital/10",
  prescription_issued: "text-primary bg-primary/10",
  default:         "text-muted-foreground bg-muted",
};

export function NotificationBell() {
  const { notifications = [], unreadCount = 0, markRead, markAllRead } = useNotifications() || {};
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const notifPath = role === "admin" ? "/admin/notifications" : role === "doctor" ? "/doctor/notifications" : "/patient/notifications";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (n: (typeof notifications)[0]) => {
    if (!n.is_read) await markRead(n.id);
    if (n.action_url) router.push(n.action_url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-80 md:w-96 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-primary/15 text-primary text-[10px] h-4 px-1.5">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcon[n.type] ?? Info;
                  const colorCls = typeColor[n.type] ?? typeColor.default;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/30 transition-colors",
                        !n.is_read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colorCls)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-xs font-medium leading-snug", !n.is_read && "text-foreground")}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border/60">
              <button
                onClick={() => { setOpen(false); router.push(notifPath); }}
                className="w-full text-xs text-primary hover:underline text-center py-1"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
