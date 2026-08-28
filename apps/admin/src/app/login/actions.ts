"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { resolveRequestHost, resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { signIn } from "@/auth";

export async function loginAction(formData: FormData) {
  // Se resuelve el tenant acá, una sola vez, con `headers()` (confiable
  // dentro de un Server Action) — y se le pasa a `signIn` como credential
  // explícito, en vez de dejar que Auth.js lo re-resuelva internamente.
  // Ver la nota en packages/auth/src/tenant-auth-config.ts. `resolveRequestHost`
  // (no `.get("host")` directo): zona no-raíz de Multi Zones (Fase 13), ver
  // la nota en login/page.tsx.
  const host = resolveRequestHost(await headers());
  const tenant = await resolveTenantFromHost(host);
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      tenantId: tenant.id,
      // "/admin/dashboard" (no "/dashboard"): a diferencia de `redirect()`
      // de next/navigation, el `redirectTo` de Auth.js NO hereda el
      // basePath solo — confirmado en la práctica (Fase 13, Multi Zones).
      redirectTo: "/admin/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}
