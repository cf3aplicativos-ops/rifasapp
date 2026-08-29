import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Ticket,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { SidebarShell } from "@rifaxapp/ui/sidebar-shell";
import { SignOutButton } from "./sign-out-button";

const TENANT_ADMIN_NAV_ITEMS = [
  { href: "/rifas", label: "Rifas", icon: <Ticket /> },
  { href: "/reportes", label: "Reportes", icon: <BarChart3 /> },
  { href: "/sedes", label: "Sedes", icon: <Building2 /> },
  { href: "/usuarios", label: "Usuarios", icon: <Users /> },
  { href: "/abonados", label: "Abonados", icon: <UserRoundCheck /> },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isTenantAdmin = session.user.rol === "TENANT_ADMIN";
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    ...(isTenantAdmin ? TENANT_ADMIN_NAV_ITEMS : []),
  ];

  return (
    <SidebarShell
      brand="Rifaxapp"
      navItems={navItems}
      user={{ label: session.user.email, sublabel: session.user.rol }}
      signOutSlot={<SignOutButton />}
    >
      {children}
    </SidebarShell>
  );
}
