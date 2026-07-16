import {
  LayoutDashboard, MessageSquare, Bell, Watch, User,
  Users, Stethoscope, Calendar, FileText, Activity,
  BarChart3, Settings, ShieldAlert, ClipboardList,
  Clock, MessageCircle, UserCheck, AlertTriangle,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

export const PATIENT_NAV: NavItem[] = [
  { href: "/patient",              label: "Dashboard",     icon: LayoutDashboard, end: true },
  { href: "/patient/appointments", label: "Appointments",  icon: Calendar },
  { href: "/patient/prescriptions",label: "Prescriptions", icon: FileText },
  { href: "/patient/messages",     label: "Messages",      icon: MessageCircle },
  { href: "/patient/assistant",    label: "AI Assistant",  icon: MessageSquare },
  { href: "/patient/alerts",       label: "Alerts",        icon: Bell },
  { href: "/patient/devices",      label: "Devices",       icon: Watch },
  { href: "/patient/profile",      label: "Profile",       icon: User },
];

export const DOCTOR_NAV: NavItem[] = [
  { href: "/doctor",              label: "Dashboard",      icon: LayoutDashboard, end: true },
  { href: "/doctor/patients",     label: "My Patients",    icon: Users },
  { href: "/doctor/alerts",       label: "Patient Alerts", icon: AlertTriangle },
  { href: "/doctor/appointments", label: "Appointments",   icon: Calendar },
  { href: "/doctor/reports",      label: "Weekly Reports", icon: BarChart3 },
  { href: "/doctor/availability", label: "Availability",   icon: Clock },
  { href: "/doctor/profile",      label: "My Profile",     icon: Stethoscope },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin",              label: "Dashboard",     icon: LayoutDashboard, end: true },
  { href: "/admin/users",        label: "Doctor and Students", icon: Users },
  { href: "/admin/verify",       label: "Verify Doctors",icon: UserCheck },
  { href: "/admin/assignments",  label: "Assignments",   icon: ClipboardList },
  { href: "/admin/alerts",       label: "All Alerts",    icon: ShieldAlert },
  { href: "/admin/analytics",    label: "Analytics",     icon: Activity },
  { href: "/admin/settings",     label: "Settings",      icon: Settings },
];
