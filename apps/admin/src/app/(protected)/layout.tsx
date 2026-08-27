import { requireSession } from "@/lib/require-session";
import { SidebarShell } from "@rifaxapp/ui/sidebar-shell";
import { SignOutButton } from "./sign-out-button";

const TENANT_ADMIN_NAV_ITEMS = [
  { href: "/rifas", label: "Rifas" },
  { href: "/reportes", label: "Reportes" },
  { href: "/sedes", label: "Sedes" },
  { href: "/usuarios", label: "Usuarios" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isTenantAdmin = session.user.rol === "TENANT_ADMIN";
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
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
