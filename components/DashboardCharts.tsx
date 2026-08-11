"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

interface Stats {
  walletPending: number;
  walletVerified: number;
  ijazahMinted: number;
  ijazahClaimed: number;
  ijazahRevoked: number;
}

const walletChartConfig = {
  pending: {
    label: "Pending",
    color: "var(--chart-3)", // amber/orange
  },
  verified: {
    label: "Terverifikasi",
    color: "var(--chart-2)", // emerald/green
  },
} satisfies ChartConfig;

const ijazahChartConfig = {
  minted: {
    label: "Diterbitkan",
    color: "var(--chart-4)", // blue/indigo
  },
  claimed: {
    label: "Diklaim",
    color: "var(--chart-2)", // purple/green
  },
  revoked: {
    label: "Direvoke",
    color: "var(--chart-1)", // red
  },
} satisfies ChartConfig;

export function DashboardCharts({ stats }: { stats: Stats }) {
  const walletData = [
    { status: "pending", count: stats.walletPending, fill: "var(--color-pending)" },
    { status: "verified", count: stats.walletVerified, fill: "var(--color-verified)" },
  ].filter(d => d.count > 0);

  const ijazahData = [
    { status: "minted", count: stats.ijazahMinted, fill: "var(--color-minted)" },
    { status: "claimed", count: stats.ijazahClaimed, fill: "var(--color-claimed)" },
    { status: "revoked", count: stats.ijazahRevoked, fill: "var(--color-revoked)" },
  ].filter(d => d.count > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
      <Card className="rounded-[2rem] border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="items-center pb-2">
          <CardTitle className="text-xl font-bold">Distribusi Status Wallet</CardTitle>
          <CardDescription>
            Perbandingan pengajuan wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {walletData.length > 0 ? (
            <ChartContainer
              config={walletChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={walletData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={70}
                  strokeWidth={5}
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-zinc-400 font-medium">
              Belum ada data wallet
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="items-center pb-2">
          <CardTitle className="text-xl font-bold">Distribusi Status Ijazah</CardTitle>
          <CardDescription>
            Perbandingan status penerbitan
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {ijazahData.length > 0 ? (
            <ChartContainer
              config={ijazahChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={ijazahData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={70}
                  strokeWidth={5}
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          ) : (
             <div className="flex items-center justify-center h-[300px] text-zinc-400 font-medium">
              Belum ada data ijazah
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
