"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Client } from "pg";
import {
  getControlPrismaClient,
  encryptConnectionString,
  hashPassword,
  TenantEstado,
} from "@rifaxapp/db-control";
import { TENANT_SCHEMA_SQL } from "@rifaxapp/db-tenant";
import { evictTenantPrismaClient, getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSuperAdmin } from "@/lib/require-superadmin";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tenantDatabaseName(slug: string) {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

function buildTenantConnectionString(dbName: string) {
  const host = process.env.TENANTS_HOST_PGHOST;
  const user = process.env.TENANTS_HOST_PGUSER;
  const password = process.env.TENANTS_HOST_PGPASSWORD;
  if (!host || !user || !password) {
    throw new Error("Faltan las env vars TENANTS_HOST_* para armar el connection string del tenant");
  }
  return `postgresql://${user}:${password}@${host}/${dbName}?channel_binding=require&sslmode=require`;
}

export type CreateTenantState =
  | { error: string; success?: undefined }
  | { success: { adminEmail: string; adminPassword: string }; error?: undefined }
  | undefined;

export async function createTenant(
  _prevState: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await requireSuperAdmin();

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();

  if (!SLUG_REGEX.test(slug)) {
    return { error: 'El slug debe ser minúsculas, números y guiones (ej: "mi-rifa")' };
  }
  if (!nombre) {
    return { error: "El nombre es obligatorio" };
  }
  if (!EMAIL_REGEX.test(adminEmail)) {
    return { error: "El email del admin no es válido" };
  }

  const prisma = getControlPrismaClient();

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return { error: `Ya existe un tenant con el slug "${slug}"` };
  }

  const tenant = await prisma.tenant.create({
    data: { slug, nombre, estado: TenantEstado.PROVISIONANDO },
  });

  const dbName = tenantDatabaseName(slug);
  const adminPassword = randomBytes(12).toString("base64url");

  try {
    const tenantDbClient = new Client({
      connectionString: process.env.TENANTS_HOST_DATABASE_URL_UNPOOLED,
    });
    await tenantDbClient.connect();
    try {
      await tenantDbClient.query(`CREATE DATABASE "${dbName}"`);
    } finally {
      await tenantDbClient.end();
    }

    const tenantConnectionString = buildTenantConnectionString(dbName);

    // Aplica el schema "plantilla" (Sede/Usuario) y crea el primer
    // TENANT_ADMIN, ambos con una conexión cruda a la DB recién creada —
    // ver docs/ESTADO.md sobre por qué no se invoca `prisma migrate deploy`
    // en runtime.
    const newDbClient = new Client({ connectionString: tenantConnectionString });
    await newDbClient.connect();
    try {
      await newDbClient.query(TENANT_SCHEMA_SQL);

      const adminPasswordHash = await hashPassword(adminPassword);
      await newDbClient.query(
        `INSERT INTO "Usuario" (id, email, "passwordHash", rol, "sedeId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'TENANT_ADMIN', NULL, now(), now())`,
        [randomUUID(), adminEmail, adminPasswordHash],
      );
    } finally {
      await newDbClient.end();
    }

    const connectionStringCifrado = encryptConnectionString(tenantConnectionString);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { estado: TenantEstado.ACTIVO, connectionStringCifrado },
    });

    // Verificación real de que el tenant quedó usable de punta a punta:
    // ejercita el mismo factory que van a usar las apps de tenant en Fase 3.
    const tenantPrisma = await getTenantPrismaClient(tenant.id);
    await tenantPrisma.usuario.count();
  } catch (error) {
    console.error(`[createTenant] falló el provisioning del tenant "${slug}"`, error);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { estado: TenantEstado.ERROR },
    });
    revalidatePath("/tenants");
    return { error: "No se pudo provisionar la base de datos del tenant. Quedó en estado ERROR." };
  }

  revalidatePath("/tenants");
  return { success: { adminEmail, adminPassword } };
}

export async function deleteTenant(id: string) {
  await requireSuperAdmin();

  const prisma = getControlPrismaClient();
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return;

  const dbName = tenantDatabaseName(tenant.slug);

  // Si el tenant tiene un PrismaClient cacheado (por ejemplo, el que dejó la
  // verificación al crearlo), hay que cerrarlo antes de intentar borrar la DB.
  // Aun así, `$disconnect()` no garantiza que la sesión del lado de Postgres/
  // Neon se cierre al instante (se vio en la práctica: DROP DATABASE fallaba
  // con "being accessed by other users" incluso después de desalojar el
  // cliente) — por eso el DROP usa WITH (FORCE) (Postgres 13+), que cierra
  // cualquier sesión colgada en vez de depender de un timing exacto.
  await evictTenantPrismaClient(tenant.id);

  const adminClient = new Client({
    connectionString: process.env.TENANTS_HOST_DATABASE_URL_UNPOOLED,
  });
  await adminClient.connect();
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  } finally {
    await adminClient.end();
  }

  await prisma.tenant.delete({ where: { id } });
  revalidatePath("/tenants");
}
