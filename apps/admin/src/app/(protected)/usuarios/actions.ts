"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertRole } from "@rifaxapp/auth";
import { hashPassword } from "@rifaxapp/db-control";
import { UsuarioRol } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { auth } from "@/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES: UsuarioRol[] = [UsuarioRol.SEDE_ADMIN, UsuarioRol.VENDEDOR];

export type CreateUsuarioState =
  | { error: string; success?: undefined }
  | { success: { email: string; password: string }; error?: undefined }
  | undefined;

export async function createUsuario(
  _prevState: CreateUsuarioState,
  formData: FormData,
): Promise<CreateUsuarioState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = String(formData.get("rol") ?? "");
  const sedeId = String(formData.get("sedeId") ?? "");

  if (!EMAIL_REGEX.test(email)) {
    return { error: "El email no es válido" };
  }
  if (!INVITABLE_ROLES.includes(rol as UsuarioRol)) {
    return { error: "El rol debe ser SEDE_ADMIN o VENDEDOR" };
  }
  if (!sedeId) {
    return { error: "La sede es obligatoria para este rol" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return { error: `Ya existe un usuario con el email "${email}"` };
  }

  const password = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);

  await prisma.usuario.create({
    data: { email, passwordHash, rol: rol as UsuarioRol, sedeId },
  });

  revalidatePath("/usuarios");
  return { success: { email, password } };
}
