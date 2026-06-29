import { LayoutDashboard, FileSignature, FolderOpen, UserCog } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";

// Customer-facing area. Proposals are live; documents still to come.
const NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/portal/proposals", label: "Proposals", icon: FileSignature },
  { to: "/portal/documents", label: "Documents", icon: FolderOpen, soon: true },
  { to: "/portal/account", label: "Account", icon: UserCog },
];

export function PortalLayout() {
  return <AppShell areaLabel="Portal" nav={NAV} />;
}
