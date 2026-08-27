import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { SignOutButton } from "./sign-out-button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isTenantAdmin = session.user.rol === "TENANT_ADMIN";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <span className="font-semibold">Rifaxapp</span>
          <Link href="/dashboard">Dashboard</Link>
          {isTenantAdmin && (
            <>
              <Link href="/sedes">Sedes</Link>
              <Link href="/usuarios">Usuarios</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {session.user.email} ({session.user.rol})
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
