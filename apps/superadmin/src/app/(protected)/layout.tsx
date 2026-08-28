import { requireSuperAdmin } from "@/lib/require-superadmin";
import { signOut } from "@/auth";
import { SidebarShell } from "@rifaxapp/ui/sidebar-shell";

const NAV_ITEMS = [
  { href: "/tenants", label: "Tenants" },
  { href: "/configuracion", label: "Dominio" },
  { href: "/apariencia", label: "Apariencia" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <SidebarShell
      brand="Rifaxapp"
      navItems={NAV_ITEMS}
      user={{ label: session.user?.email ?? "", sublabel: "Superadmin" }}
      signOutSlot={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="underline">
            Salir
          </button>
        </form>
      }
    >
      {children}
    </SidebarShell>
  );
}
