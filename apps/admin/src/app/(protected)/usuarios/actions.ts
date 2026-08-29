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
  const comisionPctRaw = String(formData.get("comisionPct") ?? "").trim();

  if (!EMAIL_REGEX.test(email)) {
    return { error: "El email no es válido" };
  }
  if (!INVITABLE_ROLES.includes(rol as UsuarioRol)) {
    return { error: "El rol debe ser SEDE_ADMIN o VENDEDOR" };
  }
  if (!sedeId) {
    return { error: "La sede es obligatoria para este rol" };
  }

  // Fase 19C: % de comisión — opcional, y solo tiene sentido para VENDEDOR
  // (se ignora silenciosamente si vino en un SEDE_ADMIN).
  let comisionPct: number | null = null;
  if (rol === UsuarioRol.VENDEDOR && comisionPctRaw) {
    comisionPct = Number(comisionPctRaw);
    if (!Number.isFinite(comisionPct) || comisionPct < 0 || comisionPct > 100) {
      return { error: "La comisión debe ser un número entre 0 y 100" };
    }
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return { error: `Ya existe un usuario con el email "${email}"` };
  }

  const password = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(password);

  await prisma.usuario.create({
    data: { email, passwordHash, rol: rol as UsuarioRol, sedeId, comisionPct },
  });

  revalidatePath("/usuarios");
  return { success: { email, password } };
}

export type ActualizarComisionState = { error?: string } | undefined;

export async function actualizarComisionVendedor(
  _prevState: ActualizarComisionState,
  formData: FormData,
): Promise<ActualizarComisionState> {
  const session = await auth();
  try {
    assertRole(session, ["TENANT_ADMIN"]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No autorizado" };
  }

  const usuarioId = String(formData.get("usuarioId") ?? "");
  const comisionPctRaw = String(formData.get("comisionPct") ?? "").trim();

  const comisionPct = comisionPctRaw ? Number(comisionPctRaw) : null;
  if (comisionPct !== null && (!Number.isFinite(comisionPct) || comisionPct < 0 || comisionPct > 100)) {
    return { error: "La comisión debe ser un número entre 0 y 100" };
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.rol !== UsuarioRol.VENDEDOR) {
    return { error: "Ese usuario no es un vendedor" };
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { comisionPct } });

  revalidatePath("/usuarios");
  return undefined;
}
