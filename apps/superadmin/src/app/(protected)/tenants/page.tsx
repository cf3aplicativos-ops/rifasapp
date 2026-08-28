import { getControlPrismaClient } from "@rifaxapp/db-control";
import { Card } from "@rifaxapp/ui/card";
import { PageHeader } from "@rifaxapp/ui/page-header";
import { CreateTenantForm } from "./create-tenant-form";
import { TenantRow } from "./tenant-row";

export default async function TenantsPage() {
  const prisma = getControlPrismaClient();
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" />

      <CreateTenantForm />

      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Slug</th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Nombre</th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Estado</th>
              <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Creado</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <TenantRow key={tenant.id} tenant={tenant} />
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">
                  Todavía no hay tenants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
