// Contacto de la landing (Fase 14) — botón "Contactanos" simple por mailto,
// sin formulario ni tabla de leads (decisión confirmada con el usuario).
// Cambiar acá si el email de contacto cambia.
const CONTACT_EMAIL = "jaiguaranosorio@gmail.com";

const FEATURES = [
  {
    title: "Boletos numerados",
    description: "Cada rifa tiene sus números fijos, elegibles uno por uno — nada al azar.",
  },
  {
    title: "Venta presencial y online",
    description:
      "Tus vendedores cobran en persona y tus clientes se compran sus propios boletos desde el celular.",
  },
  {
    title: "Cobros con Wompi",
    description: "El cliente paga online y el boleto se confirma solo, sin que nadie tenga que avisar.",
  },
  {
    title: "Reportes en tiempo real",
    description: "Recaudado, boletos vendidos y desglose por vendedor, todo actualizado al instante.",
  },
];

/**
 * Landing pública del producto (Fase 14) — se muestra en el dominio pelado
 * (sin subdominio de tenant, ej. "rifax.lat"), ver apps/clientes/src/app/page.tsx.
 * Local a esta app a propósito: es la única que sirve el dominio raíz de
 * Multi Zones, no hace falta sumarla a @rifaxapp/ui.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
          R
        </span>
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">Rifaxapp</span>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-50">
            Organizá y vendé tus rifas online
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">
            Rifaxapp es la plataforma para llevar tu rifa de punta a punta: boletos numerados, vendedores
            en la calle, clientes que se compran solos por internet y los cobros ya confirmados. Todo en
            un solo lugar.
          </p>
          <div className="mt-8">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Quiero usar Rifaxapp")}`}
              className="inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Contactanos
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[var(--radius-card)] border border-gray-200 p-6 dark:border-gray-800"
              >
                <h2 className="font-semibold text-gray-900 dark:text-gray-50">{feature.title}</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              ¿Querés llevar tu rifa a Rifaxapp?
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Escribinos y coordinamos cómo dar de alta tu organización.
            </p>
            <div className="mt-6">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Quiero usar Rifaxapp")}`}
                className="inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Contactanos
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Rifaxapp
      </footer>
    </div>
  );
}
