import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { loginAction } from "./actions";

// Forzado explícitamente: esta página resuelve el tenant por Host en cada
// visita, y no puede cachearse client-side. Ver docs/ESTADO.md (Fase 3).
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /login queda fuera del matcher del proxy (para no crear un loop de
  // redirect), así que el check de tenant se repite acá.
  const headersList = await headers();
  const tenant = await resolveTenantFromHost(headersList.get("host") ?? "");
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 p-8 dark:border-gray-800"
      >
        <h1 className="text-xl font-semibold">Rifaxapp — {tenant.slug}</h1>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Email o contraseña incorrectos.
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-gray-900 px-3 py-2 text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
