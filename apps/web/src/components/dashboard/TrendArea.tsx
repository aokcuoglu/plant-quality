"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface RawItem {
  month: string
  _count: number
}

export function TrendArea({ data }: { data: RawItem[] }) {
  const chartData = data.map((d) => ({
    month: d.month,
    defects: d._count,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Not enough data
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <span className="font-medium">{label}</span>: {payload[0].value} defect{payload[0].value !== 1 ? "s" : ""}
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="defects"
            stroke="var(--chart-3)"
            strokeWidth={2}
            fill="url(#trendGradient)"
            dot={{ fill: "var(--chart-3)", strokeWidth: 0, r: 4 }}
            activeDot={{ fill: "var(--chart-3)", strokeWidth: 2, stroke: "var(--background)", r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
