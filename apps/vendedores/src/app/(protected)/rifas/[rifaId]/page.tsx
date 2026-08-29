import { notFound } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";
import { ConsultaNumero } from "./consulta-numero";
import { VentaForm } from "./venta-form";

export default async function RifaVendedorPage({
  params,
}: {
  params: Promise<{ rifaId: string }>;
}) {
  const session = await requireSession();
  const { rifaId } = await params;

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  // Libera boletos de reservas de CLIENTE vencidas antes de mostrar la
  // grilla, para que el vendedor no vea como "no disponible" un número que
  // en realidad ya está libre de nuevo (Fase 6).
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
    select: {
      id: true,
      numero: true,
      estado: true,
      asignadoASedeId: true,
      asignadoAVendedorId: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={rifa.nombre}
        description={`$${rifa.precioBoleto.toString()} por boleto`}
      />
      <ConsultaNumero rifaId={rifa.id} />
      <VentaForm rifaId={rifa.id} boletos={boletos} vendedorId={session.user.id} />
    </div>
  );
}
