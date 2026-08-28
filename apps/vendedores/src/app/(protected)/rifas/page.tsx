import Link from "next/link";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { requireSession } from "@/lib/require-session";

export default async function RifasPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifas = await prisma.rifa.findMany({
    where: { estado: "ACTIVA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Rifas activas" />
      <div className="space-y-3">
        {rifas.map((rifa) => (
          <Card key={rifa.id}>
            <Link href={`/rifas/${rifa.id}`} className="font-medium underline">
              {rifa.nombre}
            </Link>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ${rifa.precioBoleto.toString()} por boleto · {rifa.cantidadBoletos} boletos
            </p>
          </Card>
        ))}
        {rifas.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No hay rifas activas ahora mismo.</p>
        )}
      </div>
    </div>
  );
}
