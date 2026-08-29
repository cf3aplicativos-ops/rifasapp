-- CreateEnum
CREATE TYPE "AsignacionModo" AS ENUM ('CONSECUTIVO', 'ALEATORIO', 'ABONADOS', 'TRASPASO');

-- CreateEnum
CREATE TYPE "TraspasoEstado" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "Boleto" ADD COLUMN     "abonadoId" TEXT,
ADD COLUMN     "asignacionModo" "AsignacionModo",
ADD COLUMN     "asignadoASedeId" TEXT,
ADD COLUMN     "asignadoAVendedorId" TEXT;

-- CreateTable
CREATE TABLE "Abonado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudTraspaso" (
    "id" TEXT NOT NULL,
    "boletoId" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "poseedorId" TEXT,
    "poseedorSedeId" TEXT,
    "estado" "TraspasoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "motivoRechazo" TEXT,
    "resueltoPorId" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudTraspaso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abonado_telefono_key" ON "Abonado"("telefono");

-- AddForeignKey
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_asignadoASedeId_fkey" FOREIGN KEY ("asignadoASedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_asignadoAVendedorId_fkey" FOREIGN KEY ("asignadoAVendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_abonadoId_fkey" FOREIGN KEY ("abonadoId") REFERENCES "Abonado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_boletoId_fkey" FOREIGN KEY ("boletoId") REFERENCES "Boleto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_poseedorId_fkey" FOREIGN KEY ("poseedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_poseedorSedeId_fkey" FOREIGN KEY ("poseedorSedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraspaso" ADD CONSTRAINT "SolicitudTraspaso_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
