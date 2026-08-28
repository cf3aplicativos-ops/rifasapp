"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, type NumberFormatKind } from "./number-format";

/**
 * Count-up de un número (Fase 18) — anima de 0 (o del valor anterior) hasta
 * `value` con `requestAnimationFrame`, sin librería. `formatKind` (no una
 * función de formateo) — ver `number-format.ts`: un Server Component no
 * puede pasarle una función arbitraria a este Client Component como prop,
 * React lo rechaza en runtime.
 *
 * Respeta `prefers-reduced-motion`: si está activo, muestra `value` directo
 * sin animar — igual criterio que `Reveal`.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  formatKind = "count",
}: {
  value: number;
  duration?: number;
  formatKind?: NumberFormatKind;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    // `duration` efectiva 0 con reduced-motion O con la pestaña en
    // background (no un `return` temprano con `setDisplay` síncrono, que el
    // linter de hooks rechaza) — un solo frame de rAF salta directo al
    // valor final, el `setState` queda adentro del callback de `tick`, no
    // en el cuerpo del efecto. Lo de `document.hidden` es real, no solo
    // paranoia: los navegadores directamente NO corren `requestAnimationFrame`
    // para una pestaña en background (para ahorrar batería) — sin este
    // chequeo, un dashboard abierto en una pestaña de fondo se queda
    // mostrando "0" para siempre hasta que el usuario la enfoque, en vez de
    // mostrar el valor real de una.
    const effectiveDuration =
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.hidden)
        ? 0
        : duration;

    // Salto instantáneo: NO se puede resolver con un solo frame de rAF
    // (`requestAnimationFrame` directamente no corre en una pestaña oculta,
    // el navegador la pausa entera — no alcanza con que la cuenta interna
    // dé "progress = 1" en el primer tick si ese tick nunca llega a
    // ejecutarse). `setTimeout` sí corre en background (con throttling,
    // pero corre), por eso el salto instantáneo usa un scheduler distinto
    // al de la animación real.
    if (effectiveDuration === 0) {
      const id = setTimeout(() => {
        setDisplay(value);
        fromRef.current = value;
      }, 0);
      return () => clearTimeout(id);
    }

    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic — arranca rápido, frena suave (mismo espíritu que
      // --ease-standard de theme.css, pero en JS para el rAF).
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + delta * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{formatNumber(display, formatKind)}</>;
}
