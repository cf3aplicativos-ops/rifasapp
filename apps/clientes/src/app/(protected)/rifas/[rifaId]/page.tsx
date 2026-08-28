import { notFound } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";
import { ReservaForm } from "./reserva-form";

export default async function RifaClientePage({
  params,
}: {
  params: Promise<{ rifaId: string }>;
}) {
  const session = await requireSession();
  const { rifaId } = await params;

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  // Libera reservas propias (u de otros CLIENTE) que vencieron antes de
  // mostrar la grilla (Fase 6) — así un boleto que quedó colgado en
  // RESERVADO sin confirmar vuelve a aparecer disponible.
  await expirarVentasVencidas(
    prisma,
    process.env.RESERVA_TTL_HORAS
      ? Number(process.env.RESERVA_TTL_HORAS)
      : undefined,
  );

  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.estado !== "ACTIVA") notFound();

  const boletos = await prisma.boleto.findMany({
    where: { rifaId },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, estado: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={rifa.nombre}
        description={
          rifa.descripcion
            ? `${rifa.descripcion} · $${rifa.precioBoleto.toString()} por boleto`
            : `$${rifa.precioBoleto.toString()} por boleto`
        }
      />
      <ReservaForm rifaId={rifa.id} boletos={boletos} />
    </div>
  );
}
