import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { formatNumeroBoleto, type BoletoFormatoDigitos } from "@rifaxapp/ui/boleto-format";
import { requireSession } from "@/lib/require-session";
import { TraspasoRow } from "./traspaso-row";

export default async function TraspasosPage() {
  const session = await requireSession();
  if (session.user.rol !== "SEDE_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const solicitudes = session.user.sedeId
    ? await prisma.solicitudTraspaso.findMany({
        where: { poseedorSedeId: session.user.sedeId, estado: "PENDIENTE" },
        include: { solicitante: true, rifa: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de traspaso"
        description="Números de tu sede que otro vendedor o sede pidió prestados."
        icon={<ArrowLeftRight className="h-5 w-5" />}
      />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Rifa
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Lo pide
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((solicitud) => (
                <TraspasoRow
                  key={solicitud.id}
                  solicitud={{
                    id: solicitud.id,
                    numeroFormateado: formatNumeroBoleto(
                      solicitud.numero,
                      solicitud.rifa.formatoDigitos as BoletoFormatoDigitos | null,
                    ),
                    rifaNombre: solicitud.rifa.nombre,
                    solicitanteNombre: solicitud.solicitante.nombre ?? solicitud.solicitante.email,
                  }}
                />
              ))}
              {solicitudes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No hay solicitudes pendientes.
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
