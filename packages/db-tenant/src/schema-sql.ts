// DDL generado desde prisma/migrations/20260827012343_init/migration.sql.
// Se ejecuta con un pg.Client crudo al provisionar la DB de cada tenant nuevo
// (ver apps/superadmin/.../tenants/actions.ts) — no se invoca `prisma migrate
// deploy` en runtime porque requeriría spawnear el engine de Prisma dentro de
// una función serverless.
//
// Si el schema de este package cambia: correr `npm run db:migrate` acá (con
// DATABASE_URL apuntando a una base descartable), copiar el SQL del nuevo
// archivo en prisma/migrations/, y pegarlo abajo.
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
`;
