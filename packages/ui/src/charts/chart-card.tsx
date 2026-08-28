import type { ReactNode } from "react";
import { Card } from "../card";

/**
 * Envoltorio compartido por los 3 charts de Fase 18 (`AreaChart`,
 * `DonutChart`, `RankingBarChart`) — título/subtítulo + el manejo de
 * "todavía no hay datos" en un solo lugar, para no repetirlo en cada
 * `page.tsx` que arma un chart con datos que pueden venir vacíos (un
 * tenant recién creado, un vendedor sin ventas todavía, etc.).
 */
export function ChartCard({
  title,
  subtitle,
  empty,
  emptyMessage = "Todavía no hay datos suficientes.",
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {empty ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </Card>
  );
}
