import { getControlPrismaClient } from "@rifaxapp/db-control";
import { Badge, type BadgeTone } from "@rifaxapp/ui/badge";
import { CreateTenantForm } from "./create-tenant-form";
import { DeleteTenantButton } from "./delete-tenant-button";

const ESTADO_TONE: Record<string, BadgeTone> = {
  ACTIVO: "green",
  PROVISIONANDO: "yellow",
  SUSPENDIDO: "gray",
  ERROR: "red",
};

export default async function TenantsPage() {
  const prisma = getControlPrismaClient();
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tenants</h1>

      <CreateTenantForm />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="py-2">Slug</th>
            <th className="py-2">Nombre</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Creado</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2 font-mono">{tenant.slug}</td>
              <td className="py-2">{tenant.nombre}</td>
              <td className="py-2">
                <Badge tone={ESTADO_TONE[tenant.estado] ?? "gray"}>{tenant.estado}</Badge>
              </td>
              <td className="py-2 text-gray-500">
                {tenant.createdAt.toLocaleDateString("es")}
              </td>
              <td className="py-2 text-right">
                <DeleteTenantButton id={tenant.id} />
              </td>
            </tr>
          ))}
          {tenants.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-500">
                Todavía no hay tenants.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
