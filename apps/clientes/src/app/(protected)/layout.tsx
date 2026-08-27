import { requireSession } from "@/lib/require-session";
import { SignOutButton } from "./sign-out-button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (session.user.rol !== "CLIENTE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Sin acceso a este portal</h1>
          <p className="text-gray-600 dark:text-gray-400">
            La cuenta {session.user.email} tiene el rol {session.user.rol}. Este portal es solo
            para clientes.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <span className="font-semibold">Rifaxapp</span>
        <div className="flex items-center gap-4 text-sm">
          <span>{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
