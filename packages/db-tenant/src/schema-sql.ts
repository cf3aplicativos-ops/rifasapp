// DDL generado desde prisma/migrations/ (concatenado en orden: cada migración
// nueva se pega DESPUÉS de las anteriores, nunca las reemplaza). Se ejecuta
// con un pg.Client crudo al provisionar la DB de cada tenant nuevo (ver
// apps/superadmin/.../tenants/actions.ts) — no se invoca `prisma migrate
// deploy` en runtime porque requeriría spawnear el engine de Prisma dentro de
// una función serverless.
//
// Si el schema de este package cambia: correr `npm run db:migrate` acá (con
// DATABASE_URL apuntando a una base descartable), copiar el SQL del nuevo
// archivo en prisma/migrations/, y AGREGARLO al final de este template string
// (no reemplazar lo anterior — los tenants ya provisionados no vuelven a
// correr esto, pero los nuevos necesitan el historial completo).
//
// Migraciones incluidas hasta ahora:
// - 20260827012343_init (Sede, Usuario)
// - 20260827110242_add_rifa_boleto_venta (Rifa, Boleto, Venta)
// - 20260827124558_add_venta_vencida (VentaEstado.VENCIDA)
export const TENANT_SCHEMA_SQL = `
-- CreateEnum
CREATE TYPE "UsuarioRol" AS ENUM ('TENANT_ADMIN', 'SEDE_ADMIN', 'VENDEDOR', 'CLIENTE');

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT,
    "rol" "UsuarioRol" NOT NULL,
    "sedeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "RifaEstado" AS ENUM ('BORRADOR', 'ACTIVA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "BoletoEstado" AS ENUM ('DISPONIBLE', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "VentaEstado" AS ENUM ('PENDIENTE', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'OTRO');

-- CreateTable
CREATE TABLE "Rifa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioBoleto" DECIMAL(12,2) NOT NULL,
    "cantidadBoletos" INTEGER NOT NULL,
    "estado" "RifaEstado" NOT NULL DEFAULT 'BORRADOR',
    "fechaSorteo" TIMESTAMP(3),
    "boletoGanadorId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boleto" (
    "id" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "BoletoEstado" NOT NULL DEFAULT 'DISPONIBLE',
    "ventaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Boleto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "vendedorId" TEXT,
    "clienteId" TEXT,
    "compradorNombre" TEXT,
    "compradorTelefono" TEXT,
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "estado" "VentaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rifa_boletoGanadorId_key" ON "Rifa"("boletoGanadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Boleto_rifaId_numero_key" ON "Boleto"("rifaId", "numero");

-- AddForeignKey
ALTER TABLE "Rifa" ADD CONSTRAINT "Rifa_boletoGanadorId_fkey" FOREIGN KEY ("boletoGanadorId") REFERENCES "Boleto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rifa" ADD CONSTRAINT "Rifa_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "VentaEstado" ADD VALUE 'VENCIDA';
`;
