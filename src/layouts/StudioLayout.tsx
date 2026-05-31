import {
  LayoutDashboard,
  FileText,
  Users,
  FileSignature,
  Settings,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";

// Admin back office. Only the dashboard is built in Phase 2a; the rest are
// stubbed as "soon" so the shape of the studio is visible without dead links.
const NAV: NavItem[] = [
  { to: "/studio", label: "Command Centre", icon: LayoutDashboard, end: true },
  { to: "/studio/insights", label: "Insights", icon: FileText, soon: true },
  { to: "/studio/clients", label: "Clients", icon: Users, soon: true },
  { to: "/studio/proposals", label: "Proposals", icon: FileSignature, soon: true },
  { to: "/studio/settings", label: "Settings", icon: Settings, soon: true },
];

export function StudioLayout() {
  return <AppShell areaLabel="Studio" nav={NAV} />;
}
