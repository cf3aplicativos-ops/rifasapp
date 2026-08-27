export default function TenantNoEncontradoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
      <div>
        <h1 className="text-xl font-semibold">Tenant no encontrado</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Este subdominio no corresponde a ningún tenant activo de Rifaxapp.
        </p>
      </div>
    </div>
  );
}
