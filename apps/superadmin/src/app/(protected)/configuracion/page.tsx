import { getPlatformConfig } from "@rifaxapp/db-control";
import { ConfiguracionForm } from "./configuracion-form";

export default async function ConfiguracionPage() {
  const config = await getPlatformConfig();
  const domain = config.baseDomain;
  const placeholder = domain ?? "tudominio.com";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dominio</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Guardá acá el dominio de la plataforma (ej. <span className="font-mono">rifaxapp.com</span>
          ) para tenerlo de referencia y armar las instrucciones de abajo. Esto{" "}
          <strong>no</strong> conecta nada en Vercel ni en tu proveedor de DNS por su cuenta — el
          resto de los pasos se hacen a mano.
        </p>
      </div>

      <ConfiguracionForm baseDomain={domain} />

      <div className="space-y-3 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="font-semibold">
          Pasos para conectar {domain ? <span className="font-mono">{domain}</span> : "tu dominio"}
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Comprar el dominio en cualquier registrador (Namecheap, GoDaddy, etc.).</li>
          <li>
            Agregarlo al proyecto <span className="font-mono">rifaxapp-clientes</span> en Vercel
            (ahí vive el ruteo Multi Zones) con{" "}
            <span className="font-mono">vercel domains add {placeholder}</span>, y configurar el
            wildcard <span className="font-mono">*.{placeholder}</span>.
          </li>
          <li>
            Agregar un subdominio para el panel de superadmin (ej.{" "}
            <span className="font-mono">app.{placeholder}</span>) al proyecto{" "}
            <span className="font-mono">rifaxapp-superadmin</span>.
          </li>
          <li>Configurar los DNS del registrador apuntando a Vercel (los datos exactos los da Vercel al agregar el dominio).</li>
          <li>
            Setear <span className="font-mono">TENANT_BASE_DOMAIN={placeholder}</span> como env
            var de Production en <span className="font-mono">rifaxapp-admin</span>,{" "}
            <span className="font-mono">rifaxapp-vendedores</span> y{" "}
            <span className="font-mono">rifaxapp-clientes</span>, y redeployar las 3.
          </li>
          <li>
            Agregar las rewrites de Multi Zones en{" "}
            <span className="font-mono">apps/clientes/next.config.ts</span> (ya diseñadas en{" "}
            <span className="font-mono">docs/ARQUITECTURA.md</span>).
          </li>
        </ol>
      </div>
    </div>
  );
}
