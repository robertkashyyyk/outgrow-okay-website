import {
  LayoutDashboard,
  FileText,
  Users,
  ListChecks,
  Radio,
  FileSignature,
  Inbox,
  Globe,
  Wallet,
  Settings,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { AppShell, type NavItem } from "./AppShell";
import { useAuth } from "../lib/auth-context";

// Admin back office. Only the dashboard is built in Phase 2a; the rest are
// stubbed as "soon" so the shape of the studio is visible without dead links.
const NAV: NavItem[] = [
  { to: "/studio", label: "Command Centre", icon: LayoutDashboard, end: true },
  { to: "/studio/insights", label: "Insights", icon: FileText },
  { to: "/studio/clients", label: "Clients", icon: Users },
  { to: "/studio/tasks", label: "Tasks", icon: ListChecks },
  { to: "/studio/ledger", label: "Ledger", icon: Wallet },
  { to: "/studio/signal", label: "Signal", icon: Radio },
  { to: "/studio/proposals", label: "Proposals", icon: FileSignature },
  { to: "/studio/report-funnel", label: "Report Funnel", icon: Inbox },
  { to: "/studio/site-review", label: "Website Review", icon: Globe },
  { to: "/studio/settings", label: "Settings", icon: Settings, soon: true },
];

export function StudioLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const isPartner = profile?.role === "partner";

  // Partners are walled to the Website Review tool: any other Studio path bounces
  // there, and the nav shows only that one item.
  if (isPartner && !location.pathname.startsWith("/studio/site-review")) {
    return <Navigate to="/studio/site-review" replace />;
  }

  const nav = isPartner
    ? NAV.filter((n) => n.to === "/studio/site-review")
    : NAV;

  return <AppShell areaLabel={isPartner ? "Partner" : "Studio"} nav={nav} />;
}
