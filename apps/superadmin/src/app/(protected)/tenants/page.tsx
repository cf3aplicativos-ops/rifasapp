import { getControlPrismaClient } from "@rifaxapp/db-control";
import { CreateTenantForm } from "./create-tenant-form";
import { DeleteTenantButton } from "./delete-tenant-button";

const ESTADO_STYLES: Record<string, string> = {
  ACTIVO: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  PROVISIONANDO: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  SUSPENDIDO: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  ERROR: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
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
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[tenant.estado] ?? ""}`}
                >
                  {tenant.estado}
                </span>
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
