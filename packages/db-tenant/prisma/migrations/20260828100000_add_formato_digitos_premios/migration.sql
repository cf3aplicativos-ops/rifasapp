-- CreateEnum
CREATE TYPE "RifaFormatoDigitos" AS ENUM ('DOS', 'TRES', 'CUATRO');

-- AlterTable
ALTER TABLE "Rifa" ADD COLUMN     "formatoDigitos" "RifaFormatoDigitos";

-- CreateTable
CREATE TABLE "PremioAnticipado" (
    "id" TEXT NOT NULL,
    "rifaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "numero" INTEGER NOT NULL,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "entregadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremioAnticipado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PremioAnticipado_rifaId_numero_key" ON "PremioAnticipado"("rifaId", "numero");

-- AddForeignKey
ALTER TABLE "PremioAnticipado" ADD CONSTRAINT "PremioAnticipado_rifaId_fkey" FOREIGN KEY ("rifaId") REFERENCES "Rifa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
