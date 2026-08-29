-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "comisionPct" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "liquidacionId" TEXT;

-- CreateTable
CREATE TABLE "Liquidacion" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "periodoDesde" TIMESTAMP(3) NOT NULL,
    "periodoHasta" TIMESTAMP(3) NOT NULL,
    "comisionPct" DECIMAL(5,2) NOT NULL,
    "montoVentas" DECIMAL(12,2) NOT NULL,
    "montoComision" DECIMAL(12,2) NOT NULL,
    "cantidadVentas" INTEGER NOT NULL,
    "generadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Liquidacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "Liquidacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liquidacion" ADD CONSTRAINT "Liquidacion_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liquidacion" ADD CONSTRAINT "Liquidacion_generadaPorId_fkey" FOREIGN KEY ("generadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
