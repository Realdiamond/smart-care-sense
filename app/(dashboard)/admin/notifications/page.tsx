"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Loader2, Info, Calendar, FileText, HeartPulse, AlertTriangle, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
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
  emergency_alert:    "text-destructive bg-destructive/10",
  vital_alert:        "text-vital bg-vital/10",
  prescription_issued:"text-primary bg-primary/10",
  doctor_assigned:    "text-success bg-success/10",
  system:             "text-muted-foreground bg-muted",
};

export default function NotificationsPage() {
  const { notifications = [], unreadCount = 0, markRead, markAllRead, loading } = useNotifications() || {};

  useEffect(() => { document.title = "Notifications — KennyPulse"; }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Notifications</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 border-border/60">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">You'll see important updates here.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const Icon = typeIcon[n.type] ?? Info;
              const colorCls = typeColor[n.type] ?? typeColor.system;
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card
                    className={cn(
                      "p-4 flex items-start gap-4 border transition-colors cursor-pointer hover:bg-muted/20",
                      !n.is_read ? "border-primary/20 bg-primary/5" : "border-border/50 bg-card/40"
                    )}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colorCls)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn("text-sm font-medium leading-snug", !n.is_read && "text-foreground")}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.is_read && <Badge className="bg-primary/15 text-primary text-[10px] h-4 px-1.5">New</Badge>}
                          <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
