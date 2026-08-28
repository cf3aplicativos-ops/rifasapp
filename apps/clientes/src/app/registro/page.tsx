import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformConfig } from "@rifaxapp/db-control";
import { resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { AuthShell } from "@rifaxapp/ui/auth-shell";
import { RegistroForm } from "./registro-form";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const headersList = await headers();
  const tenant = await resolveTenantFromHost(headersList.get("host") ?? "");
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  const config = await getPlatformConfig();

  return (
    <AuthShell
      title="Rifaxapp"
      subtitle={`Crear cuenta · ${tenant.slug}`}
      backgroundImageUrl={config.loginBackgroundUrl ?? undefined}
    >
      <RegistroForm />
    </AuthShell>
  );
}
