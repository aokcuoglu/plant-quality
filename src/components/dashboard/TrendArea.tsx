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
        Yeterli veri birikmedi
      </div>
    )
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border-0 bg-black px-3 py-2 text-xs text-white shadow-md">
                  <span className="font-medium">{label}</span>: {payload[0].value} defect{payload[0].value !== 1 ? "s" : ""}
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="defects"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#trendGradient)"
            dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
            activeDot={{ fill: "#3b82f6", strokeWidth: 2, stroke: "#fff", r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
