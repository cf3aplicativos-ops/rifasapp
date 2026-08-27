import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { AuthShell } from "@rifaxapp/ui/auth-shell";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { loginAction } from "./actions";

// Forzado explícitamente: esta página resuelve el tenant por Host en cada
// visita, y no puede cachearse client-side (el Client Router Cache de
// Next.js puede reusar un segmento renderizado antes — se vio en la
// práctica un redirect a /tenant-no-encontrado repetido después de un
// logout, sin ningún log nuevo del lado del servidor, señal de un segmento
// cacheado reproducido en vez de un render fresco).
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
    <AuthShell
      title="Rifaxapp"
      subtitle={tenant.slug}
      error={error && "Email o contraseña incorrectos."}
    >
      <form action={loginAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required className={formInputClassName} />
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
            className={formInputClassName}
          />
        </div>

        <Button type="submit" className="w-full">
          Ingresar
        </Button>
      </form>
    </AuthShell>
  );
}
