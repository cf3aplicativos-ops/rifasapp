"use server";

import { revalidatePath } from "next/cache";
import { setPlatformBaseDomain } from "@rifaxapp/db-control";
import { requireSuperAdmin } from "@/lib/require-superadmin";

// Sin protocolo ni paths — solo el dominio (ej. "rifaxapp.com").
const DOMAIN_REGEX = /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i;

export type GuardarDominioState = { error: string } | { success: true } | undefined;

export async function guardarDominio(
  _prevState: GuardarDominioState,
  formData: FormData,
): Promise<GuardarDominioState> {
  await requireSuperAdmin();

  const baseDomain = String(formData.get("baseDomain") ?? "")
    .trim()
    .toLowerCase();

  if (!DOMAIN_REGEX.test(baseDomain)) {
    return { error: 'Ingresá un dominio válido, sin "http://" ni rutas (ej: "rifaxapp.com")' };
  }

  await setPlatformBaseDomain(baseDomain);

  revalidatePath("/configuracion");
  return { success: true };
}
