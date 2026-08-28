import { getControlPrismaClient } from "./client";
import type { PlatformConfig } from "@prisma/client";

/**
 * `PlatformConfig` es un singleton (Fase 12): una sola fila, sin id fijo
 * hardcodeado. `getPlatformConfig` la crea perezosamente la primera vez que
 * se pide (mismo espíritu simple que el resto del control-plane, sin migrar
 * un id conocido a mano).
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  const prisma = getControlPrismaClient();
  const existing = await prisma.platformConfig.findFirst();
  if (existing) return existing;
  return prisma.platformConfig.create({ data: {} });
}

export async function setPlatformBaseDomain(baseDomain: string): Promise<PlatformConfig> {
  const current = await getPlatformConfig();
  const prisma = getControlPrismaClient();
  return prisma.platformConfig.update({
    where: { id: current.id },
    data: { baseDomain },
  });
}

/** `url: null` limpia el campo (botón "Quitar imagen" de /apariencia, Fase 16). */
export async function setLoginBackgroundUrl(url: string | null): Promise<PlatformConfig> {
  const current = await getPlatformConfig();
  const prisma = getControlPrismaClient();
  return prisma.platformConfig.update({
    where: { id: current.id },
    data: { loginBackgroundUrl: url },
  });
}
