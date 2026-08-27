import { requireSession } from "@/lib/require-session";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium text-gray-500">Email</dt>
        <dd className="font-mono">{session.user.email}</dd>
        <dt className="font-medium text-gray-500">Rol</dt>
        <dd className="font-mono">{session.user.rol}</dd>
        <dt className="font-medium text-gray-500">Tenant ID</dt>
        <dd className="font-mono">{session.user.tenantId}</dd>
      </dl>
    </div>
  );
}
