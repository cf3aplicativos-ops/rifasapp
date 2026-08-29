import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
import { requireSession } from "@/lib/require-session";
import { CreatePremioForm } from "./create-premio-form";
import { PremioRow } from "./premio-row";

export default async function PremiosPage({
  params,
}: {
  params: Promise<{ rifaId: string }>;
}) {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const { rifaId } = await params;
  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa) notFound();

  const premios = await prisma.premioAnticipado.findMany({
    where: { rifaId },
    orderBy: { numero: "asc" },
  });

  const formato = rifa.formatoDigitos as BoletoFormatoDigitos | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Premios anticipados — ${rifa.nombre}`}
        description="Premios que se entregan antes del sorteo principal, atados a un número de boleto puntual."
        icon={<Gift className="h-5 w-5" />}
      />

      <Link href={`/rifas/${rifaId}`} className="inline-block text-sm underline">
        Volver a la rifa
      </Link>

      <CreatePremioForm rifaId={rifaId} />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Premio
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Descripción
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {premios.map((premio) => (
                <PremioRow
                  key={premio.id}
                  id={premio.id}
                  numeroFormateado={formatNumeroBoleto(premio.numero, formato)}
                  nombre={premio.nombre}
                  descripcion={premio.descripcion}
                  entregado={premio.entregado}
                />
              ))}
              {premios.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay premios anticipados para esta rifa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </Reveal>
    </div>
  );
}
