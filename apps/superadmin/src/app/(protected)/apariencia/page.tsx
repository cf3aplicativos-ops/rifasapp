import { getPlatformConfig } from "@rifaxapp/db-control";
import { AparienciaForm } from "./apariencia-form";

export default async function AparienciaPage() {
  const config = await getPlatformConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Apariencia</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Imagen de fondo para la pantalla de inicio de sesión de{" "}
          <strong>admin</strong>, <strong>vendedores</strong> y{" "}
          <strong>clientes</strong> — es global para toda la plataforma, no por
          organización. El login del superadmin no usa esta imagen.
        </p>
      </div>

      <AparienciaForm currentUrl={config.loginBackgroundUrl} />
    </div>
  );
}
