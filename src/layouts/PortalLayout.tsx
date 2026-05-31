import { LayoutDashboard, FileSignature, FolderOpen } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";

// Customer-facing area. Dashboard only for now; documents/proposals follow.
const NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/portal/proposals", label: "Proposals", icon: FileSignature, soon: true },
  { to: "/portal/documents", label: "Documents", icon: FolderOpen, soon: true },
];

export function PortalLayout() {
  return <AppShell areaLabel="Portal" nav={NAV} />;
}
