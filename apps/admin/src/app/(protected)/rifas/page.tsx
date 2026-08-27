import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantPrismaClient } from "@rifaxapp/tenant-resolver";
import { requireSession } from "@/lib/require-session";
import { CreateRifaForm } from "./create-rifa-form";
import { RifaEstadoButtons } from "./rifa-estado-buttons";

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
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
      <h1 className="text-2xl font-semibold">Rifas</h1>

      <CreateRifaForm />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2">Nombre</th>
            <th className="py-2">Precio</th>
            <th className="py-2">Boletos</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rifas.map((rifa) => (
            <tr key={rifa.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2">
                <Link href={`/rifas/${rifa.id}`} className="underline">
                  {rifa.nombre}
                </Link>
              </td>
              <td className="py-2">${rifa.precioBoleto.toString()}</td>
              <td className="py-2">{rifa.cantidadBoletos}</td>
              <td className="py-2">{ESTADO_LABEL[rifa.estado] ?? rifa.estado}</td>
              <td className="py-2">
                <RifaEstadoButtons id={rifa.id} estado={rifa.estado} />
              </td>
            </tr>
          ))}
          {rifas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-500">
                Todavía no hay rifas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
