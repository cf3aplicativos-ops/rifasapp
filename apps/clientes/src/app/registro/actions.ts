"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { hashPassword } from "@rifaxapp/db-control";
import { UsuarioRol } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient, resolveTenantFromHost } from "@rifaxapp/tenant-resolver";
import { signIn } from "@/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type RegistroState = { error?: string } | undefined;

export async function registerAction(
  _prevState: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const host = (await headers()).get("host") ?? "";
  const tenant = await resolveTenantFromHost(host);
  if (!tenant) {
    redirect("/tenant-no-encontrado");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_REGEX.test(email)) {
    return { error: "El email no es válido" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  const prisma = await getTenantPrismaClient(tenant.id);

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return { error: `Ya existe una cuenta con el email "${email}"` };
  }

  const passwordHash = await hashPassword(password);
  await prisma.usuario.create({
    data: { email, passwordHash, rol: UsuarioRol.CLIENTE, sedeId: null },
  });

  try {
    await signIn("credentials", { email, password, tenantId: tenant.id, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      // No debería pasar (recién se creó con estas credenciales), pero por
      // las dudas no dejamos al usuario colgado sin feedback.
      return { error: "La cuenta se creó pero no se pudo iniciar sesión. Probá loguearte." };
    }
    throw error;
  }

  return undefined;
}
