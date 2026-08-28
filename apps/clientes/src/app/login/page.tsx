import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformConfig } from "@rifaxapp/db-control";
import { resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { AuthShell } from "@rifaxapp/ui/auth-shell";
import { Button } from "@rifaxapp/ui/button";
import { formInputClassName } from "@rifaxapp/ui/form-input";
import { PasswordInput } from "@rifaxapp/ui/password-input";
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
  const config = await getPlatformConfig();

  return (
    <AuthShell
      title="Rifaxapp"
      subtitle={tenant.slug}
      error={error && "Email o contraseña incorrectos."}
      backgroundImageUrl={config.loginBackgroundUrl ?? undefined}
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
          <PasswordInput id="password" name="password" required />
        </div>

        <Button type="submit" className="w-full">
          Ingresar
        </Button>

        <p className="text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="underline">
            Creá una acá
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
