import { notFound } from "next/navigation";
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
