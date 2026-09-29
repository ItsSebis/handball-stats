"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { computeQuote, QUOTES, toPercent, type QuoteKey } from "./format-quote";
import type { GameTrendPoint } from "./queries";

const FIELD_KEYS: QuoteKey[] = ["wurfquote", "quote7m"];
const KEEPER_KEYS: QuoteKey[] = ["paradenquote", "quote7mParaden"];
const COLORS = ["var(--chart-1)", "var(--chart-2)"];

function buildConfig(keys: QuoteKey[]): ChartConfig {
  const config: ChartConfig = {};
  keys.forEach((key, i) => {
    config[key] = { label: QUOTES[key].label, color: COLORS[i] };
  });
  return config;
}

type TrendDatum = { date: string; [key: string]: string | number | null };

function buildData(points: GameTrendPoint[], keys: QuoteKey[]): TrendDatum[] {
  return points.map((p) => {
    const row: TrendDatum = { date: p.date };
    for (const key of keys) {
      const { made, attempts } = QUOTES[key];
      // null (not 0) so the line gaps for a game with no attempts, rather than dipping to 0.
      row[key] = toPercent(computeQuote(p[made], p[attempts]));
    }
    return row;
  });
}

function TrendChart({ title, config, data }: { title: string; config: ChartConfig; data: TrendDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>
          <LineChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {Object.keys(config).map((key) => (
              <Line key={key} dataKey={key} type="monotone" stroke={`var(--color-${key})`} />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function StatsTrendChart({ points }: { points: GameTrendPoint[] }) {
  if (points.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <TrendChart title="Feldspieler-Trend" config={buildConfig(FIELD_KEYS)} data={buildData(points, FIELD_KEYS)} />
      <TrendChart title="Torhüter-Trend" config={buildConfig(KEEPER_KEYS)} data={buildData(points, KEEPER_KEYS)} />
    </div>
  );
}
