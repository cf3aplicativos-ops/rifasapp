"use client";

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_COLORS,
  useChartAnimationEnabled,
  useChartColorScheme,
} from "./chart-theme";
import { ChartCard } from "./chart-card";
import { formatNumber, type NumberFormatKind } from "../number-format";

export type AreaChartPoint = { fecha: string; valor: number };

/**
 * Área de una serie a lo largo del tiempo (Fase 18) — recaudación diaria en
 * los dashboards de admin/vendedores. `valueFormat` es un identificador
 * (`"money"`/`"count"`, ver `number-format.ts`), no una función — este
 * componente lo recibe casi siempre desde un Server Component (`page.tsx`),
 * que no puede pasarle una función arbitraria a un Client Component.
 */
export function AreaChart({
  title,
  subtitle,
  data,
  valueFormat = "count",
}: {
  title: string;
  subtitle?: string;
  data: AreaChartPoint[];
  valueFormat?: NumberFormatKind;
}) {
  const { grid, text, tooltipBg, tooltipBorder } = useChartColorScheme();
  const animationEnabled = useChartAnimationEnabled();
  const empty = data.every((d) => d.valor === 0);

  return (
    <ChartCard title={title} subtitle={subtitle} empty={empty}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="rifaxAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={CHART_COLORS.brand}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_COLORS.brand}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={grid}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="fecha"
              stroke={text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              stroke={text}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => formatNumber(Number(value), valueFormat)}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={CHART_COLORS.brand}
              strokeWidth={2}
              fill="url(#rifaxAreaFill)"
              isAnimationActive={animationEnabled}
              animationDuration={700}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
