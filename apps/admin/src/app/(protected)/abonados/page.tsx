import { redirect } from "next/navigation";
import { UserRoundCheck } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";
import { AbonadoRow } from "./abonado-row";
import { CreateAbonadoForm } from "./create-abonado-form";

export default async function AbonadosPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const abonados = await prisma.abonado.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abonados"
        description="Clientes recurrentes: al asignar boletos en modo &quot;abonados&quot;, cada uno recibe reservado su número preferido si sigue libre."
        icon={<UserRoundCheck className="h-5 w-5" />}
      />

      <CreateAbonadoForm />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Teléfono
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Número preferido
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {abonados.map((abonado) => (
                <AbonadoRow
                  key={abonado.id}
                  id={abonado.id}
                  nombre={abonado.nombre}
                  telefono={abonado.telefono}
                  numero={abonado.numero}
                />
              ))}
              {abonados.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay abonados registrados.
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
