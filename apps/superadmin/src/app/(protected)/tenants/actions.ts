"use server";

import { revalidatePath } from "next/cache";
import { Client } from "pg";
import { getControlPrismaClient, encryptConnectionString, TenantEstado } from "@rifaxapp/db-control";
import { requireSuperAdmin } from "@/lib/require-superadmin";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

export type CreateTenantState = { error?: string } | undefined;

export async function createTenant(
  _prevState: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await requireSuperAdmin();

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!SLUG_REGEX.test(slug)) {
    return { error: 'El slug debe ser minúsculas, números y guiones (ej: "mi-rifa")' };
  }
  if (!nombre) {
    return { error: "El nombre es obligatorio" };
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

  try {
    const adminClient = new Client({
      connectionString: process.env.TENANTS_HOST_DATABASE_URL_UNPOOLED,
    });
    await adminClient.connect();
    try {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
    } finally {
      await adminClient.end();
    }

    const connectionStringCifrado = encryptConnectionString(buildTenantConnectionString(dbName));

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { estado: TenantEstado.ACTIVO, connectionStringCifrado },
    });
  } catch (error) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { estado: TenantEstado.ERROR },
    });
    revalidatePath("/tenants");
    return { error: "No se pudo provisionar la base de datos del tenant. Quedó en estado ERROR." };
  }

  revalidatePath("/tenants");
  return undefined;
}

export async function deleteTenant(id: string) {
  await requireSuperAdmin();

  const prisma = getControlPrismaClient();
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return;

  const dbName = tenantDatabaseName(tenant.slug);

  const adminClient = new Client({
    connectionString: process.env.TENANTS_HOST_DATABASE_URL_UNPOOLED,
  });
  await adminClient.connect();
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await adminClient.end();
  }

  await prisma.tenant.delete({ where: { id } });
  revalidatePath("/tenants");
}
