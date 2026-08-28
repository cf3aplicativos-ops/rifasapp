"use client";

import {
  Bar,
  BarChart,
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

export type RankingBarPoint = { label: string; value: number };

/**
 * Barras de ranking/comparación (Fase 18) — top vendedores por monto
 * (barras horizontales, nombres pueden ser largos) o tenants creados por
 * mes (barras verticales, categorías cortas). `direction` describe el
 * sentido VISUAL de la barra, no el prop `layout` crudo de Recharts (que
 * usa la convención invertida y es más confuso de leer en el caller).
 * `valueFormat` es un identificador (`"money"`/`"count"`), no una función —
 * ver `number-format.ts`, este componente casi siempre lo recibe desde un
 * Server Component.
 */
export function RankingBarChart({
  title,
  subtitle,
  data,
  direction = "horizontal",
  valueFormat = "count",
}: {
  title: string;
  subtitle?: string;
  data: RankingBarPoint[];
  direction?: "horizontal" | "vertical";
  valueFormat?: NumberFormatKind;
}) {
  const { grid, text, tooltipBg, tooltipBorder } = useChartColorScheme();
  const animationEnabled = useChartAnimationEnabled();
  const empty = data.length === 0 || data.every((d) => d.value === 0);
  const height =
    direction === "horizontal" ? Math.max(160, data.length * 40) : 256;

  return (
    <ChartCard title={title} subtitle={subtitle} empty={empty}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {direction === "horizontal" ? (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                stroke={grid}
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke={text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke={text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                cursor={{ fill: grid, opacity: 0.4 }}
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => formatNumber(Number(value), valueFormat)}
              />
              <Bar
                dataKey="value"
                fill={CHART_COLORS.brand}
                radius={[0, 4, 4, 0]}
                isAnimationActive={animationEnabled}
                animationDuration={700}
              />
            </BarChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke={grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke={text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke={text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: grid, opacity: 0.4 }}
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => formatNumber(Number(value), valueFormat)}
              />
              <Bar
                dataKey="value"
                fill={CHART_COLORS.brand}
                radius={[4, 4, 0, 0]}
                isAnimationActive={animationEnabled}
                animationDuration={700}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
