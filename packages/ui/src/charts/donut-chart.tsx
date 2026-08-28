"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useChartAnimationEnabled, useChartColorScheme } from "./chart-theme";
import { ChartCard } from "./chart-card";

export type DonutSlice = { label: string; value: number; color: string };

/**
 * Dona de proporciones (Fase 18) — estado de boletos (admin) o de mis
 * ventas (cliente). Cada slice trae su propio `color` (no una paleta fija)
 * para que el caller reuse los mismos tonos que ya usa `Badge` para ese
 * mismo estado — ver `CHART_COLORS` en `chart-theme.ts`.
 */
export function DonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: DonutSlice[];
}) {
  const { tooltipBg, tooltipBorder, text } = useChartColorScheme();
  const animationEnabled = useChartAnimationEnabled();
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <ChartCard title={title} subtitle={subtitle} empty={total === 0}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              isAnimationActive={animationEnabled}
              animationDuration={700}
            >
              {data.map((slice) => (
                <Cell key={slice.label} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: text }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
