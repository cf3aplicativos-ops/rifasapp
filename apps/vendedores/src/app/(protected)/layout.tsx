import { LayoutDashboard, Ticket } from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { SidebarShell } from "@rifaxapp/ui/sidebar-shell";
import { SignOutButton } from "./sign-out-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { href: "/rifas", label: "Rifas", icon: <Ticket /> },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (session.user.rol !== "VENDEDOR") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Sin acceso a este portal</h1>
          <p className="text-gray-600 dark:text-gray-400">
            La cuenta {session.user.email} tiene el rol {session.user.rol}. Este
            portal es solo para VENDEDOR — usá el dashboard de admin en su
            lugar.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <SidebarShell
      brand="Rifaxapp — Vendedores"
      navItems={NAV_ITEMS}
      user={{ label: session.user.email }}
      signOutSlot={<SignOutButton />}
    >
      {children}
    </SidebarShell>
  );
}
