import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { Reveal } from "@rifaxapp/ui/reveal";
import { requireSession } from "@/lib/require-session";
import { CreateRifaForm } from "./create-rifa-form";
import { RifaEstadoButtons } from "./rifa-estado-buttons";

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};

const ESTADO_TONE: Record<string, BadgeTone> = {
  BORRADOR: "yellow",
  ACTIVA: "green",
  CERRADA: "gray",
  CANCELADA: "red",
};

const FORMATO_LABEL: Record<string, string> = {
  DOS: "2 dígitos (00-99)",
  TRES: "3 dígitos (000-999)",
  CUATRO: "4 dígitos (0000-9999)",
};

export default async function RifasPage() {
  const session = await requireSession();
  if (session.user.rol !== "TENANT_ADMIN") {
    redirect("/dashboard");
  }

  const prisma = await getTenantPrismaClient(session.user.tenantId);
  const rifas = await prisma.rifa.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Rifas" icon={<Ticket className="h-5 w-5" />} />

      <CreateRifaForm />

      <Reveal>
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Precio
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Boletos
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Formato
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rifas.map((rifa) => (
                <tr
                  key={rifa.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-900"
                >
                  <td className="px-6 py-3">
                    <Link href={`/rifas/${rifa.id}`} className="underline">
                      {rifa.nombre}
                    </Link>
                  </td>
                  <td className="px-6 py-3">${rifa.precioBoleto.toString()}</td>
                  <td className="px-6 py-3">{rifa.cantidadBoletos}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {FORMATO_LABEL[rifa.formatoDigitos ?? ""] ?? "Sin formato"}
                  </td>
                  <td className="px-6 py-3">
                    <Badge tone={ESTADO_TONE[rifa.estado] ?? "gray"}>
                      {ESTADO_LABEL[rifa.estado] ?? rifa.estado}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <RifaEstadoButtons id={rifa.id} estado={rifa.estado} />
                  </td>
                </tr>
              ))}
              {rifas.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Todavía no hay rifas.
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
