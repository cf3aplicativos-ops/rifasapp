import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  LayoutDashboard,
  Search,
  Ticket,
  UserRoundCheck,
  Users,
  Wallet,
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
  { href: "/consultas", label: "Consultas", icon: <Search /> },
  { href: "/liquidaciones", label: "Liquidaciones", icon: <Wallet /> },
];

// Fase 19B: hasta acá un SEDE_ADMIN solo tenía "Dashboard" en el sidebar —
// primera vez que tiene pantallas propias para hacer algo (pedir un número
// prestado, resolver lo que le piden a su sede).
const SEDE_ADMIN_NAV_ITEMS = [
  { href: "/consultas", label: "Consultas", icon: <Search /> },
  { href: "/traspasos", label: "Traspasos", icon: <ArrowLeftRight /> },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isTenantAdmin = session.user.rol === "TENANT_ADMIN";
  const isSedeAdmin = session.user.rol === "SEDE_ADMIN";
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
    ...(isTenantAdmin ? TENANT_ADMIN_NAV_ITEMS : isSedeAdmin ? SEDE_ADMIN_NAV_ITEMS : []),
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
