import { notFound } from "next/navigation";
import { expirarVentasVencidas } from "@rifaxapp/db-tenant";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";
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
    process.env.RESERVA_TTL_HORAS ? Number(process.env.RESERVA_TTL_HORAS) : undefined,
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
      <div>
        <h1 className="text-2xl font-semibold">{rifa.nombre}</h1>
        <p className="text-sm text-gray-500">${rifa.precioBoleto.toString()} por boleto</p>
      </div>
      <VentaForm rifaId={rifa.id} boletos={boletos} />
    </div>
  );
}
