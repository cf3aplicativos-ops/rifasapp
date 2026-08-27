import Link from "next/link";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";

export default async function RifasPage() {
  const session = await requireSession();
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifas = await prisma.rifa.findMany({
    where: { estado: "ACTIVA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rifas activas</h1>
      <ul className="space-y-2">
        {rifas.map((rifa) => (
          <li key={rifa.id} className="rounded border border-gray-200 p-4 dark:border-gray-800">
            <Link href={`/rifas/${rifa.id}`} className="font-medium underline">
              {rifa.nombre}
            </Link>
            {rifa.descripcion && <p className="text-sm text-gray-600 dark:text-gray-400">{rifa.descripcion}</p>}
            <p className="text-sm text-gray-500">
              ${rifa.precioBoleto.toString()} por boleto · {rifa.cantidadBoletos} boletos
            </p>
          </li>
        ))}
        {rifas.length === 0 && <p className="text-gray-500">No hay rifas activas ahora mismo.</p>}
      </ul>
    </div>
  );
}
