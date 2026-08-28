import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { extractSlugFromHost, resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { LandingPage } from "./landing-page";

// Mismo motivo que login/registro (Fase 3): resuelve por Host en cada
// visita, no se puede cachear un segmento renderizado para un host distinto.
export const dynamic = "force-dynamic";

export default async function Home() {
  // "/" queda fuera del matcher del proxy (Fase 14, ver proxy.ts) — sin
  // eso, un visitante sin sesión nunca llegaba a este componente.
  const headersList = await headers();
  const host = headersList.get("host") ?? "";

  // Sin subdominio de tenant (dominio pelado, ej. "rifax.lat"): landing
  // pública del producto, no hay tenant del que depender.
  if (!extractSlugFromHost(host)) {
    return <LandingPage />;
  }

  // Con subdominio: mismo comportamiento de siempre.
  const tenant = await resolveTenantFromHost(host);
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  redirect("/dashboard");
}
