"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export interface SidebarNavItem {
  href: string;
  label: string;
}

/**
 * Envoltorio del panel protegido de las 4 apps (Fase 12), reemplaza el
 * `<header>` con nav horizontal que tenía cada `(protected)/layout.tsx`.
 * Client Component porque necesita `usePathname` para resaltar el link
 * activo y estado local para el menú hamburguesa en mobile — no sabe nada
 * de Auth.js: `signOutSlot` es el botón/form de logout que ya tenía cada
 * app (`SignOutButton` en admin/vendedores/clientes, un form inline en
 * superadmin), pasado tal cual.
 */
export function SidebarShell({
  brand,
  navItems,
  user,
  signOutSlot,
  children,
}: {
  brand: string;
  navItems: SidebarNavItem[];
  user: { label: string; sublabel?: string };
  signOutSlot: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            // text-black en el link activo (no text-white, Fase 16):
            // bg-brand-600 es amarillo #F5C518, texto blanco no pasa
            // contraste minimo sobre ese fondo.
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-brand-600 text-black" : "text-sidebar-foreground hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="space-y-2 border-t border-white/10 px-5 py-4 text-sm text-sidebar-foreground">
      <div className="truncate text-white">{user.label}</div>
      {user.sublabel && <div className="truncate text-xs">{user.sublabel}</div>}
      <div>{signOutSlot}</div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar md:flex">
        <div className="px-5 py-6 text-lg font-semibold text-white">{brand}</div>
        {navLinks}
        <div className="mt-auto">{userBlock}</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 md:hidden">
          <span className="text-base font-semibold">{brand}</span>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
          >
            Menú
          </button>
        </header>
        {mobileOpen && (
          <div className="flex flex-col bg-sidebar md:hidden">
            {navLinks}
            {userBlock}
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
