import Link from "next/link";
import { Ticket } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
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
      <PageHeader title="Rifas activas" icon={<Ticket className="h-5 w-5" />} />
      <div className="space-y-3">
        {rifas.map((rifa, i) => (
          <Reveal key={rifa.id} delay={i * 60}>
            <Card interactive>
              <Link
                href={`/rifas/${rifa.id}`}
                className="font-medium underline"
              >
                {rifa.nombre}
              </Link>
              {rifa.descripcion && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {rifa.descripcion}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                ${rifa.precioBoleto.toString()} por boleto ·{" "}
                {rifa.cantidadBoletos} boletos
              </p>
            </Card>
          </Reveal>
        ))}
        {rifas.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            No hay rifas activas ahora mismo.
          </p>
        )}
      </div>
    </div>
  );
}
