"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Envoltorio de entrada animada al hacer scroll (Fase 18) — dispara
 * `animate-fade-up` (definida en `theme.css`) la primera vez que el
 * elemento entra al viewport, vía `IntersectionObserver` nativo. No usa
 * ninguna librería de animación (ver la decisión de Fase 18: el catálogo
 * pedido — fade-in, count-up, hover-lift — no justifica el peso de
 * framer-motion).
 *
 * `prefers-reduced-motion` respetado a mano: si el usuario lo pide, se
 * muestra directo sin animar (no hay accesibilidad de "animación pero
 * lenta", se omite del todo, que es lo que ese media feature pide).
 *
 * `delay` (ms) para escalonar una lista de `Reveal` hermanos — cada uno
 * con un `delay` incremental se ve como una entrada en cascada.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Inicializador perezoso para el caso "reduced motion" (no un `setState`
  // síncrono adentro del efecto, que el linter de hooks rechaza — mismo
  // criterio que `useChartColorScheme`): si el usuario lo pide, arranca
  // visible directo y el efecto de abajo ni monta el `IntersectionObserver`.
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Copia en un ref del valor inicial (no reactivo) — el efecto de abajo
  // solo necesita decidir UNA vez, al montar, si hace falta observar. Leer
  // `visible` (state) directo ahí forzaría a declararlo en las deps del
  // efecto (exhaustive-deps), lo que lo re-ejecutaría de más cada vez que
  // cambia — un ref evita esa dependencia reactiva a propósito.
  const skipObserverRef = useRef(visible);

  useEffect(() => {
    const node = ref.current;
    if (!node || skipObserverRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${visible ? "animate-fade-up" : "opacity-0"} ${className ?? ""}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
