export { auth as proxy } from "@/auth";

export const config = {
  // Fase 13: /admin y /vendedores se reenvían a las otras zonas de Multi
  // Zones (ver next.config.ts) — su auth la maneja el proxy de esa otra
  // app, no el de acá. Sin excluirlos, el proxy de clientes intercepta la
  // request ANTES de que el rewrite llegue a pegarle a la otra app —
  // confirmado en la práctica: sin esto, "/admin/login" redirigía al
  // "/login" de clientes (perdiendo el subdominio del tenant), nunca
  // llegaba a admin.
  // Fase 14: "|$" agregado a la negación — excluye la raíz exacta ("/",
  // nada después de la barra) para que un visitante sin sesión llegue de
  // verdad a page.tsx (la landing pública en el dominio sin subdominio) en
  // vez de que el proxy lo mande derecho a /login antes de renderizar
  // nada. No afecta rutas reales ("/dashboard", etc. siguen protegidas).
  matcher: [
    "/((?!login|registro|tenant-no-encontrado|api/auth|api/webhooks|admin|vendedores|_next/static|_next/image|favicon.ico|$).*)",
  ],
};
