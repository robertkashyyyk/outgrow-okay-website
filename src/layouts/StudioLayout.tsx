import {
  LayoutDashboard,
  FileText,
  Users,
  ListChecks,
  Radio,
  FileSignature,
  Inbox,
  Globe,
  Settings,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";

// Admin back office. Only the dashboard is built in Phase 2a; the rest are
// stubbed as "soon" so the shape of the studio is visible without dead links.
const NAV: NavItem[] = [
  { to: "/studio", label: "Command Centre", icon: LayoutDashboard, end: true },
  { to: "/studio/insights", label: "Insights", icon: FileText },
  { to: "/studio/clients", label: "Clients", icon: Users },
  { to: "/studio/tasks", label: "Tasks", icon: ListChecks },
  { to: "/studio/signal", label: "Signal", icon: Radio },
  { to: "/studio/proposals", label: "Proposals", icon: FileSignature },
  { to: "/studio/report-funnel", label: "Report Funnel", icon: Inbox },
  { to: "/studio/site-review", label: "Website Review", icon: Globe },
  { to: "/studio/settings", label: "Settings", icon: Settings, soon: true },
];

export function StudioLayout() {
  return <AppShell areaLabel="Studio" nav={NAV} />;
}
